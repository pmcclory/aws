'use strict';

const AWS = require('aws-sdk');
const Promise = require('bluebird');
const clientConfig = require('./client-config');
const _ = require('lodash');

function createClient(config = {}) {
  config = _.merge(_.cloneDeep(clientConfig), config);
  const client = new AWS.CloudSearchDomain(config);
  Promise.promisifyAll(client);

  return client;
}

module.exports = class CloudSearch {
  /**
   * For CloudSearchDomain, it's _required_ that the `endpoint` field be passed
   * into the constructor for some god forsaken reason, but it's documented
   * here: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudSearchDomain.html#constructor-property
   *
   * So that means when you instantiate this class, you must do it like this:
   * const cs = new AWS.CloudSearch({endpoint: 'my-cs-domain-url'});
   */
  constructor(config) {
    this.config = config;
    this.client = createClient(config);
  }
};
