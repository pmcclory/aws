'use strict';

const AWS = require('aws-sdk');
const Promise = require('bluebird');
const clientConfig = require('./client-config');

module.exports = function({ account, arnPrefix = 'sns-', arnSuffix = '', defaultSubject }) {
  const SNS = new AWS.SNS(clientConfig);
  const publish = Promise.promisify(SNS.publish, { context: SNS });

  function constructARN(name) {
    return `arn:aws:sns:${AWS.config.region}:${account}:${arnPrefix}${name}${arnSuffix}`;
  }

  return {
    publish: ({ message, topicName, subject = defaultSubject }) => {
      if (typeof message !== 'string') {
        try {
          message = JSON.stringify(message);
        } catch (e) {
          return Promise.reject(e);
        }
      }

      return publish({ Message: message, TopicArn: constructARN(topicName), Subject: subject });
    }
  };
};
