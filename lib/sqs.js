'use strict';

const _ = require('lodash');
const AWS = require('aws-sdk');
const Promise = require('bluebird');

/**
 * Convenience class for wrapping sqs methods with promises
 * 
 * @param account 
 * @param queuePrefix 
 * @param queueSuffix 
 */
module.exports = ({ account, queuePrefix, queueSuffix }) => {

  const SQS = new AWS.SQS();
  Promise.promisifyAll(SQS);

  function getQueueURL(name) {
    return `https://sqs.${AWS.config.region}.amazonaws.com/${account}/${queuePrefix}${name}${queueSuffix}`;
  }

  return {
    /**
     * formats a SQL url
     * @param name the name of the queue identifier
     */
    getQueueURL: getQueueURL,

    /**
     * purges messages from queue
     * @param queueUrl Name of queue
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
     * Retrieves a message from a queue
     * @param queueName Name of queue
     * @param max max number of messages to pull, defaults to 10
     */
    retrieve: ({ queueName, max = 10, messageAttributeNames = [] }) => SQS.receiveMessageAsync({
      MaxNumberOfMessages: max,
      QueueUrl: getQueueURL(queueName),
      WaitTimeSeconds: 20,
      VisibilityTimeout: AWS.config.visibilityTimeout,
      MessageAttributeNames: messageAttributeNames
    }),

    /**
     * Publishes a message to a queue
     * @param queueName Name of queue
     * @param payload body of message
     * @param attrs attributes attached to message
     */
    send: ({ queueName, payload, attrs }) => SQS.sendMessageAsync({
      MessageBody: payload,
      QueueUrl: getQueueURL(queueName),
      MessageAttributes: attrs
    }),

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