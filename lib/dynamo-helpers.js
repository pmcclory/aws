'use strict';

const _ = require('lodash');


/**
 * Prepare key replacements (ExpressionAttributeNames) for a dynamo expression
 *
 * @param {array} keys - list of keys i.e. column names
 * @return {object}
 *
 * @example
 * prepareAttributeNames(['plan', 'status']);
 * // returns
 * {
 *   '#plan': 'plan',
 *   '#status': 'status'
 * }
 */
module.exports.prepareAttributeNames = (keys) => {
  const replacements = _.map(keys, (key) => `#${key}`);
  return _.zipObject(replacements, keys);
};


/**
 * Prepare value replacements (ExpressionAttributeValues) for a dynamo expression
 *
 * @param {object} values - hash map of values
 * @return {object}
 *
 * @example
 * prepareAttributeValues({ plan: 'free1', status: 'active' });
 * // returns
 * {
 *   ':plan': 'free1',
 *   ':status': 'active'
 * }
 */
module.exports.prepareAttributeValues = (values) => {
  return _.mapKeys(values, (value, key) => `:${key}`);
};


/**
 * Prepare a Dynamo UpdateExpression
 *
 * @param {array} update keys
 * @return {string}
 *
 * @example
 * prepareUpdateExpression(Object.keys({ plan: 'free1', status: 'active' }));
 * // returns
 * 'SET #plan = :plan AND #status = :status'
 *
 */
module.exports.prepareUpdateExpression = (keys) => {
  const expression = _.map(keys, (key) => `#${key} = :${key}`);
  return `SET ${expression.join(' AND ')}`;
};


/**
 * Prepare parameters for dynamo's UpdateItem, including the prepared
 * UpdateExpression as well as the key and value replacements by convention
 *
 * @param {object} updates - hash map of updates
 * @return {object} - dynamo update parameters object
 *
 * @example
 * prepareUpdate({ plan: 'free1', status: 'active' })
 * // returns
 * {
 *   UpdateExpression: 'SET #plan = :plan AND #status = :status',
 *   ExpressionAttributeNames: {
 *     '#plan': 'plan',
 *     '#status': 'status'
 *   },
 *   ExpressionAttributeValues: {
 *     ':plan': 'free1',
 *     ':status': 'active'
 *   }
 * }
 *
 */
module.exports.prepareUpdate = (updates) => {
  const keys = Object.keys(updates);
  return {
    UpdateExpression: module.exports.prepareUpdateExpression(keys),
    ExpressionAttributeNames: module.exports.prepareAttributeNames(keys),
    ExpressionAttributeValues: module.exports.prepareAttributeValues(updates)
  }
}
