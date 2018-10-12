'use strict';

const AWS = require('aws-sdk');
const Promise = require('bluebird');
const clientConfig = require('./client-config');

module.exports = function init({
  account,
  arnPrefix = 'sns-',
  arnSuffix = '',
  defaultSubject
}) {
  const SNS = new AWS.SNS(clientConfig);
  const publish = Promise.promisify(SNS.publish, { context: SNS });

  function constructARN(name) {
    return `arn:aws:sns:${
      AWS.config.region
    }:${account}:${arnPrefix}${name}${arnSuffix}`;
  }

  return {
    publish: ({
      message,
      topicName,
      subject = defaultSubject,
      messageAttributes
    }) => {
      if (typeof message !== 'string') {
        try {
          message = JSON.stringify(message);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      const messageToPublish = {
        Message: message,
        TopicArn: constructARN(topicName),
        Subject: subject
      };

      if (messageAttributes !== undefined) {
        messageToPublish.MessageAttributes = messageAttributes;
      }

      return publish(messageToPublish);
    }
  };
};
