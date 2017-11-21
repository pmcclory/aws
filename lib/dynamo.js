'use strict';

const Promise = require('bluebird');
const AWS = require('aws-sdk');
const helpers = require('./dynamo-helpers');
const _ = require('lodash');

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
    if (config == undefined) {
      config = {};
    }
    this.config = config;

    if ( !('bypassProxy' in config) || config.bypassProxy == true) {
      _.defaults(config, { 'httpOptions' : { 'agent': undefined } });
      // in case it already had agent set
      config.httpOptions.agent = undefined;
    }
    this.client = new AWS.DynamoDB.DocumentClient(config);

    this.helpers = helpers;
    Promise.promisifyAll(this.client);
  }

};
