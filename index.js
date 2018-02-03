'use strict';

const AWS = require('aws-sdk');
const proxy = require('proxy-agent');
const clientConfig = require('./lib/client-config');

module.exports = {
  initialize: (conf) => {
    const awsConf = {};
    const configurationKeys = [
      'accessKeyId',
      'secretAccessKey',
      'region',
      'proxy',
      'maxRetries',
      'retryDelayOptions'
    ];

    configurationKeys.forEach((key) => {
      if (key === 'proxy' && conf.proxy) {
        clientConfig.httpOptions = { agent: proxy(conf.proxy) };
      } else if (key in conf) {
        awsConf[key] = conf[key];
      }
    });

    AWS.config.update(awsConf);
  },
  DynamoDB: require('./lib/dynamo'),
  SNS: require('./lib/sns'),
  SQS: require('./lib/sqs'),
  SDK: AWS
};
