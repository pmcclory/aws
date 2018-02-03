'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const helpers = require('./dynamo-helpers');
const _ = require('lodash');
const clientConfig = require('./client-config');

/**
 * Creates an AWS document client instance and decorates the instance
 * with convenience methods for scanning / querying all records
 */
function createClient(config) {

  if (config === undefined) {
    config = {};
  }
  config = _.merge(clientConfig, config);

  /*
   * by default try to connect to dynamo directly
   */
  if (!('bypassProxy' in config) || config.bypassProxy === true) {
    if ('httpOptions' in config && 'agent' in config.httpOptions) {
      /*
       * remove the proxy agent (from config if it's there).  the
       * distinction between removing the key and setting it to undefined
       * is a big one, as AWS will simply not use connection pooling if
       * it's set to undefined
       */
      delete config.httpOptions.agent;
    }
  }
  const client = new AWS.DynamoDB.DocumentClient(config);
  client.consistentReads = config.consistentReads || false;
  Promise.promisifyAll(client);

  // patch read methods to use consistent read if specified
  _.forEach(['queryAsync', 'getAsync', 'scanAsync'], function(fname) {
    const tmpFunc = client[fname];
    client[fname] = function wrapper(params) {
      if (this.consistentReads && (fname !== 'queryAsync' || !('IndexName' in params))) {
        params.ConsistentRead = true;
      }
      return tmpFunc.call(client, params);
    };
  });

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
