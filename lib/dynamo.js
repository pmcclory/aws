'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');

/**
 * @example
 * const aws = require('@sparkpost/aws');
 * const ddbClient = new aws.DynamoDB(config).client;
 *
 * ddbClient.getAsync(..etc).then(...etc);
 *
 */
module.exports = class DynamoDB {

  constructor(config) {
    this.config = config;
    this.client = new AWS.DynamoDB.DocumentClient(config);
    Promise.promisifyAll(this.client);
  }

  // getRawClient() {
  //   const rawClient = new AWS.DynamoDB(config);
  //   Promise.promisifyAll(rawClient);
  //   return rawClient;
  // }

}
