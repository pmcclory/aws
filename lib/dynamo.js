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
  // copy b/c we want any dynamo specific flags to override
  // what was set globally - but we don't want to clobber the global
  // settings
  config = _.merge(_.cloneDeep(clientConfig), config);

  /*
   * by default try to connect to dynamo directly
   */
  if (config.bypassProxy !== false) {
    if ('httpOptions' in config) {
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

  /**
   * Works like queryAll but on each page of the query a callback is invoked.  Its expected that the callback returns a promise.
   * This function will resolve when all paged callback promises(param pagePromise) resolve.
   *
   * @param params {Object} - Query Params for DynamoDB.DocumentClient.query
   * @param pagePromise {Function} - A callback function that returns a promise
   * @returns {*|PromiseLike<T>|Promise<T>}
   */
  client.queryAllPager = function queryAllRecordsPager(params, pagePromise) {
    let queryResults;
    return client.queryAsync(params)
      .then((results) => {
        queryResults = results;
        return pagePromise(queryResults.Items || []);
      })
      .then(() => {
        if ('LastEvaluatedKey' in queryResults) {
          params.ExclusiveStartKey = queryResults.LastEvaluatedKey;
          return queryAllRecordsPager.apply(this, [params, pagePromise]);
        }
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
