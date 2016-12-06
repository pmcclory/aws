'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const cache = require('./cache');

/**
 * @example
 * const aws = require('@sparkpost/aws');
 * const ddbClient = new aws.DynamoDB(config).client;
 *
 * ddbClient.getAsync(..etc).then(...etc);
 *
 */
module.exports = {
  getInstance: (config) => {
    if (cache.get('awsInitialized') !== true) {
      throw new Error('AWS has not been initialized yet, please check config & code');
    }

    this._instance = this._instance || new AWS.DynamoDB.DocumentClient(config);
    Promise.promisifyAll(this._instance);

    return this._instance;
  }
}