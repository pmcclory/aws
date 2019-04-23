'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const byteLength = require('buffer').Buffer.byteLength;
const utils = module.exports;
const https = require('https');

utils.isBufferOrString = (obj) => {
  return Buffer.isBuffer(obj) || typeof obj === 'string';
};

/**
 * Compute the size of an SQS message, which is -- the sum of the base64-encoded
 * message body + the size of message attribute keys + values.
 *
 * @param {*} body an SQS message body
 * @param {*} attrs a map of SQS message attributes
 */
utils.computeMessageSize = function computeMessageSize(body, attrs) {
  const attrsSize = _.reduce(
    attrs,
    (sum, value, key) => {
      // String value attributes are key + value byte length
      if (value.StringValue) {
        return sum + byteLength(value.StringValue) + byteLength(key);
      }

      /* String value list attributes are returned as arrays of strings, so
     * bytes in all of list strings plus byte length of key
     */
      if (!_.isEmpty(value.StringListValues)) {
        return (
          sum
          + _.reduce(
            value.StringListValues,
            (sum, value) => sum + Buffer.byteLength(value),
            0
          )
          + byteLength(key)
        );
      }

      // String value attributes are key + value byte length
      if (value.BinaryValue) {
        return sum + byteLength(value.BinaryValue, 'binary') + byteLength(key);
      }

      /* Binary value list attributes are returned as arrays of binary data, so
     * bytes in all of list strings plus byte length of key
     */
      if (!_.isEmpty(value.BinaryListValues)) {
        return (
          sum
          + _.reduce(
            value.BinaryListValues,
            (sum, value) => sum + Buffer.byteLength(value, 'binary'),
            0
          )
          + byteLength(key)
        );
      }

      // Catch-all, but should never hit this
      return sum;
    },
    0
  );

  if (utils.isBufferOrString(body)) {
    // https://stackoverflow.com/questions/13378815/base64-length-calculation
    return (((4 * body.length / 3) + 3) & ~3) + attrsSize;
  } else {
    return byteLength(Buffer.from(body).toString('base64')) + attrsSize;
  }

};

utils.promisify = function promisify(obj) {
  Promise.promisifyAll(obj, {
    filter: (name) => name.indexOf('Async') === -1
  });
};

/**
 * Agent setup for underlying AWS services.  This allows for configuring
 * a given AWS SDK to keepalive connections, when proxy configuration is
 * not being used.
 *
 * @param {Object} config     AWS proxy configuration defaults
 * @param Boolean bypassProxy whether to bypass the proxy and keepalive
 *                            connections
 * @param {Object} AwsConstructor AWS SDK class constructor to apply
 *                                http configuration to
 */
utils.setHttpAgent = function setHttpAgent(
  config = {},
  bypassProxy = false,
  AwsConstructor
) {
  config.httpOptions = _.merge(config.httpOptions, {});

  if (bypassProxy) {
    config.httpOptions.agent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true,
      maxSockets: 50
    });
  }

  config = _.omit(config, 'bypassProxy');

  return new AwsConstructor(config);
};
