'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const helpers = require('./dynamo-helpers');

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
    this.helpers = helpers;
    Promise.promisifyAll(this.client);
  }

  queryAll(params, items = []) {
    return this.client.queryAsync(params)
      .then((results) => {
        results.Items = results.Items || [];

        items = items.concat(results.Items);

        if ('LastEvaluatedKey' in results) {
          params.ExclusiveStartKey = results.LastEvaluatedKey;
          return this.queryAll(params, items);
        }

        return items;
      });
  }

  scanAll(params, items = []) {
    return this.client.scanAsync(params)
      .then((results) => {
        results.Items = results.Items || [];

        items = items.concat(results.Items);

        if ('LastEvaluatedKey' in results) {
          params.ExclusiveStartKey = results.LastEvaluatedKey;
          return this.scanAll(params, items);
        }

        return items;
      });
  }
};
