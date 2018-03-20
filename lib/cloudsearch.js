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
  constructor(config) {
    this.config = config;
    this.client = createClient(config);
  }
};
