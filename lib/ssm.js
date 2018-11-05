'use strict';

const AWS = require('aws-sdk');
const clientConfig = require('./client-config');
const _ = require('lodash');
const promisify = require('./utils').promisify;

function createClient(config = {}) {
  config = _.merge(_.cloneDeep(clientConfig), config);
  const client = new AWS.SSM(config);
  promisify(client);

  return client;
}

module.exports = class SSM {
  constructor(config) {
    this.config = config;
    this.client = createClient(config);
  }
};
