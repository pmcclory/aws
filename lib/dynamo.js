'use strict';

const BPromise = require('bluebird');
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
    config = config || {}
    this.AWS = config.awsInstance || new AWS(config.aws);
    this.client = new this.AWS.DynamoDB.DocumentClient(config.client);
    BPromise.promisifyAll(this.client);
  }

}
