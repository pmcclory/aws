'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const helpers = require('./dynamo-helpers');
const _ = require('lodash');

/**
 * Creates an AWS document client instance and decorates the instance
 * with convenience methods for scanning / querying all records
 */
function createClient(config) {

  if (config === undefined) {
    config = {};
  }

  if (!('bypassProxy' in config) || config.bypassProxy === true) {
    _.defaults(config, { 'httpOptions': { 'agent': undefined } });
    // in case it already had agent set
    config.httpOptions.agent = undefined;
  }

  const client = new AWS.DynamoDB.DocumentClient(config);
  client.consistentReads = 'consistentReads' in config && config.consistentReads;
  Promise.promisifyAll(client);

  var getAsyncTmp = client.getAsync;
  client.getAsync = function getAsyncWrapper(params) {
    if (this.consistentReads) {
      params.ConsistentRead = true;
    }
    return getAsyncTmp.call(client, params);
  };

  client.queryAll = function queryAllRecords(params, items = []) {
    return client.queryAsync(params)
      .then((results) => {
        results.Items = results.Items || [];

        items = items.concat(results.Items);

        if ('LastEvaluatedKey' in results) {
          params.ExclusiveStartKey = results.LastEvaluatedKey;
          return queryAllRecords.apply(this, [params, items]);
        }

        return items;
      });
  };

  client.scanAll = function scanAllRecords(params, items = []) {
    return client.scanAsync(params)
      .then((results) => {
        results.Items = results.Items || [];

        items = items.concat(results.Items);

        if ('LastEvaluatedKey' in results) {
          params.ExclusiveStartKey = results.LastEvaluatedKey;
          return scanAllRecords.apply(this, [params, items]);
        }

        return items;
      });
  };

  return client;
}

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
    this.client = createClient(config);
    this.helpers = helpers;
  }
};
