'use strict';

const AWS = require('aws-sdk');

module.exports = {
  initialize: (conf) => {
    let awsConf = {}
      , configurationKeys = ['accessKeyId', 'secretAccessKey', 'region', 'httpOptions'];

    configurationKeys.forEach((key) => {
      if (key in conf) {
        awsConf[key] = conf[key];
      }
    });

    AWS.config.update(awsConf);
  },
  DynamoDB: require('./lib/dynamo')
};
