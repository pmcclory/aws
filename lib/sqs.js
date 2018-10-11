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
const computeMessageSize = require('./utils').computeMessageSize;
const promisify = require('./utils').promisify;
const setHttpAgent = require('./utils').setHttpAgent;

// 256kb => b
const MAX_MSG_SIZE = 262144;

/**
 * Convenience class for wrapping sqs methods with promises
 *
 * @param account The AWS account ID, used to construct the Queue URL
 * @param queuePrefix A queue name prefix, defaults to the empty string
 * @param queueSuffix A queue name suffix, defaults to the empty string
 * @param defaultVisibilityTimeout A default visibility timeout used for retrieving messages, defaults to 300 secons
 */
module.exports = ({ account, queuePrefix = '', queueSuffix = '', defaultVisibilityTimeout = 300, bypassProxy = false }) => {
  const SQS = setHttpAgent(clientConfig, bypassProxy, AWS.SQS);
  const S3 = setHttpAgent(clientConfig, bypassProxy, AWS.S3);

  promisify(SQS);
  promisify(S3);

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

  /**
   * SQS batch receiver helper for pulling messages from SQS, decompressing, and
   * fetching extended messages through S3.
   * 
   * @param Array{Object} messages Array of SQS messages
   * @return Promise{*} Promise that resolves when all SQS messages in a batch
   *                    have been decompressed / optionally fetched from s3
   */
  function extendedSqsBatchMessageResolver(messages) {
    // Allow easy iteration on empty receives
    if (_.isEmpty(messages.Messages)) {
      return [];
    }

    return Promise.map(messages.Messages, extendedSqsMessageResolver);
  }

  /**
   * For each message received, resolve either the decompressed raw sqs
   * message, or pull from s3, decompress, and resolve that.
   *  
   * @param {Object} message SQS message
   */
  function extendedSqsMessageResolver(message) {
    let promiseChain = Promise.resolve(message);

    if (message.MessageAttributes && message.MessageAttributes.EXTENDED_S3_BUCKET && message.MessageAttributes.EXTENDED_S3_KEY) {
      promiseChain = S3.getObjectAsync({
        Bucket: message.MessageAttributes.EXTENDED_S3_BUCKET.StringValue,
        Key: message.MessageAttributes.EXTENDED_S3_KEY.StringValue
      });
    }

    return promiseChain
      .then((message) => decompress(Buffer.from(message.Body, 'base64')))
      .then((message) => JSON.parse(message))
      .then((body) => ({ message, body }))
      .catch((err) => ({ message, error: err }));
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
     * Retrieves a set of extended messages from a queue, meaning: if the 
     * message is too large to fit in sqs, it will pull an s3 bucket object 
     * if the message was too large to fit in sqs.  Original sqs message is
     * returned alongside the resolved JSON object.
     * 
     * @param queueName Name of queue
     * @param max max number of messages to pull, defaults to 10
     */
    extendedRetrieve: ({ queueName, max = 10, messageAttributeNames = [], visibilityTimeout }) => SQS.receiveMessageAsync({
      MaxNumberOfMessages: max,
      QueueUrl: getQueueURL(queueName),
      WaitTimeSeconds: 20,
      VisibilityTimeout: visibilityTimeout || defaultVisibilityTimeout,
      MessageAttributeNames: _.union(messageAttributeNames, ['EXTENDED_S3_BUCKET', 'EXTENDED_S3_KEY'])
    })
      .then(extendedSqsBatchMessageResolver),

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
    extendedSend: ({ queueName, payload, attrs = {}, s3Bucket, shards = 50, expiration = 48 }) => {
      if (!s3Bucket) {
        return Promise.reject(new Error('S3 Bucket name required'));
      }

      if (typeof payload !== 'string') {
        try {
          payload = JSON.stringify(payload);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      let key = false;

      return compress(payload)
        .then((payload) => {
          if (computeMessageSize(payload, attrs) > MAX_MSG_SIZE) {
            key = `/${Math.floor(Math.random() * shards)}/${uuid()}.json.gz`;

            return S3.uploadAsync({
              Body: payload,
              Bucket: s3Bucket,
              ContentEncoding: 'gzip',
              Expires: getHoursFromNow(expiration),
              Key: key
            });
          }

          return payload;
        })
        .then((input) => {
          if (key) {
            attrs.EXTENDED_S3_BUCKET = { DataType: 'String', StringValue: s3Bucket };
            attrs.EXTENDED_S3_KEY = { DataType: 'String', StringValue: key };

            input = 'true';
          }

          return send({
            queueName,
            attrs,
            payload: input.toString('base64')
          });
        })
        .then((sqsResponse) => ({ res: sqsResponse, extended: !!key }));
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
