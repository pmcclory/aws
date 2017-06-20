'use strict';

const AWS = require('aws-sdk');
const proxy = require('proxy-agent')

module.exports = {
  initialize: (conf) => {
    let awsConf = {}
      , configurationKeys = [
        'accessKeyId',
        'secretAccessKey',
        'region',
        'proxy',
        'maxRetries',
        'retryDelayOptions',
        'visibilityTimeout'
      ];

    configurationKeys.forEach((key) => {
      if (key === 'proxy' && conf.proxy) {
        awsConf.httpOptions = { agent: proxy(conf.proxy) };
      } else if (key in conf) {
        awsConf[key] = conf[key];
      }
    });

    AWS.config.update(awsConf);
  },
  DynamoDB: require('./lib/dynamo'),
  SQS: require('./lib/sqs')
};
