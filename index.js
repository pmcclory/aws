'use strict';

const AWS = require('aws-sdk');
const cache = require('./lib/cache');

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
    cache.set('awsInitialized', true);
  },
  DynamoDB: require('./lib/dynamo')
};
