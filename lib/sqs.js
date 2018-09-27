'use strict';

const _ = require('lodash');
const AWS = require('aws-sdk');
const Promise = require('bluebird');
const clientConfig = require('./client-config');
const uuid = require('uuid/v4');
const util = require('util');
const zlib = require('zlib');
const compress = util.promisify(zlib.gzip);
const decompress = util.promisify(zlib.gunzip);

// 256kb => b
const TWO_FIFTYSIX_K = 256 * 1024;

/**
 * Convenience class for wrapping sqs methods with promises
 *
 * @param account The AWS account ID, used to construct the Queue URL
 * @param queuePrefix A queue name prefix, defaults to the empty string
 * @param queueSuffix A queue name suffix, defaults to the empty string
 * @param defaultVisibilityTimeout A default visibility timeout used for retrieving messages, defaults to 300 secons
 */
module.exports = ({ account, queuePrefix = '', queueSuffix = '', defaultVisibilityTimeout = 300 }) => {
  const SQS = new AWS.SQS(clientConfig);
  const S3  = new AWS.S3(clientConfig);
  
  Promise.promisifyAll(SQS);
  Promise.promisifyAll(S3);

  function getQueueURL(name) {
    return `https://sqs.${AWS.config.region}.amazonaws.com/${account}/${queuePrefix}${name}${queueSuffix}`;
  }
  
  function getHoursFromNow(hours) {
    const now = new Date();
    return now.setHours(hours);
  }
  
  function send({ queueName, payload, attrs }) {
    if (typeof payload !== 'string') {
      try {
        payload = JSON.stringify(payload);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return SQS.sendMessageAsync({
      MessageBody: payload,
      QueueUrl: getQueueURL(queueName),
      MessageAttributes: attrs
    });
  }

  return {
    /**
     * formats a SQL url
     * @param name the name of the queue identifier
     */
    getQueueURL: getQueueURL,

    /**
     * purges messages from queue
     * @param queueName Name of queue
     */
    purge: ({ queueName }) => SQS.purgeQueueAsync({
      QueueUrl: getQueueURL(queueName)
    }),

    /**
     * removes(acks) a message from the queue
     * @param queueName Name of queue
     * @param entries number of messages to remove
     *
     */
    remove: ({ queueName, entries }) => SQS.deleteMessageBatchAsync({ Entries: _.uniqBy(entries, 'Id'), QueueUrl: getQueueURL(queueName) }),

    /**
     * Retrieves an extended message to a queue, meaning: if the message is
     * too large to fit in sqs, it will pull an s3 bucket object if the message
     * was too large to fit in sqs.
     * 
     * @param queueName Name of queue
     * @param max max number of messages to pull, defaults to 10
     */
    extendedRetrieve: ({ queueName, max = 10, messageAttributeNames = [], visibilityTimeout }) => {
      return SQS.receiveMessageAsync({
        MaxNumberOfMessages: max,
        QueueUrl: getQueueURL(queueName),
        WaitTimeSeconds: 20,
        VisibilityTimeout: visibilityTimeout || defaultVisibilityTimeout,
        MessageAttributeNames: messageAttributeNames
      })
        .then((messages) => {
          if (_.isEmpty(messages.Messages)) {
            return [];
          }

          return Promise.map(messages.Messages, (message) => {            
            return decompress(Buffer.from(message.Body, 'base64'))
              .then((messageBody) => {
                messageBody = JSON.parse(messageBody);
                            
                if (!_.get(messageBody, 'spAwsMetadata._key')) {
                  return [message, messageBody];
                }

                return S3.getObjectAsync({
                  Bucket: messageBody.spAwsMetadata._bucket,
                  Key: messageBody.spAwsMetadata._key 
                })
                  .then((message) => decompress(Buffer.from(message.Body, 'base64')))
                  .then((message) => JSON.parse(message))
                  .then((body) => [message, body])
                  .catch((err) => { return { message, error: err }});
              });
            });
        });
    },

    /**
     * Retrieves a message from a queue
     * @param queueName Name of queue
     * @param max max number of messages to pull, defaults to 10
     */
    retrieve: ({ queueName, max = 10, messageAttributeNames = [], visibilityTimeout }) => SQS.receiveMessageAsync({
      MaxNumberOfMessages: max,
      QueueUrl: getQueueURL(queueName),
      WaitTimeSeconds: 20,
      VisibilityTimeout: visibilityTimeout || defaultVisibilityTimeout,
      MessageAttributeNames: messageAttributeNames
    }),

    /**
     * Publishes an extended message to a queue, meaning: if the message is
     * too large to fit in sqs, it will write a sqs with a pointer to an s3
     * bucket
     *
     * @param queueName  Name of queue
     * @param payload    body of message
     * @param attrs      attributes attached to message
     * @param s3Bucket   bucket name for message storage, if it exceeds limit
     * @param prefix     bucket path prefix (no slashes)
     * @param shards     number of bucket shard paths
     * @param expiration hours to retain the message before expiring
     */
    extendedSend: ({ queueName, payload, attrs, s3Bucket = 'sp-sqs-extended', prefix = 'g', shards = 50, expiration = 48 }) => {
      if (typeof payload !== 'string') {
        try {
          payload = JSON.stringify(payload);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      let key = false;
      const messageStream = compress(payload);

      if (Buffer.byteLength(payload) > TWO_FIFTYSIX_K) {
        key = `/${prefix}/${Math.floor(Math.random() * shards)}/${uuid()}.json.gz`;

        messageStream
          .then((payload) => {
            S3.uploadAsync({
              Body: payload,
              Bucket: s3Bucket,
              ContentEncoding: 'gzip',
              Expires: getHoursFromNow(expiration),
              Key: key
            });
          });
      }

      return messageStream
        .then((input) => {
          if (key) {
            return compress(JSON.stringify({ spAwsMetadata: { _key: key, _bucket: s3Bucket } }));
          }
          
          return input;
        })
        .then((input) => send({
          queueName,
          attrs,
          payload: input.toString('base64')
        }));
    },

    /**
     * Publishes a message to a queue
     * @param queueName Name of queue
     * @param payload body of message
     * @param attrs attributes attached to message
     */
    send: send,

    /**
     * sets the visiblity timeout of a message
     * @param queueName Name of queue
     * @param handle handle used to change timeout of message
     * @param timeout value to set visibility timeout
     */
    setVizTimeout: ({ queueName, handle, timeout }) => SQS.changeMessageVisibilityAsync({
      QueueUrl: getQueueURL(queueName),
      ReceiptHandle: handle,
      VisibilityTimeout: timeout
    })
  };
};
