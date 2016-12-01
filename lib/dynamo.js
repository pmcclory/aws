'use strict';

const BPromise = require('bluebird');
const AWS = require('aws-sdk');

/**
 * @param {object} AWS - config-ready AWS lib instance
 * @param {object} config - optional document client config
 * 
 * @example
 * const AWS = require('aws-sdk');
 * const ddbClient = new require('@sparkpost/aws').DynamoDB(AWS).client;
 *
 * ddbClient.getAsync(..etc).then(...etc);
 *
 */
module.exports = class DynamoDB {

  constructor(AWS, config) {
    this.client = new AWS.DynamoDB.DocumentClient(config);
    BPromise.promisifyAll(this.client);
  }

}
