'use strict';

const _ = require('lodash');


/**
 * Prepare key replacements (ExpressionAttributeNames) for a dynamo expression
 *
 * @param {array} fields - list of fields or column names
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
module.exports.prepareAttributeNames = (fields) => {
  const keys = _.map(fields, (field) => `#${field}`);
  return _.zipObject(keys, fields);
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
 * @param {object|array} updates
 * @return {string}
 *
 * @example
 * prepareUpdateExpression({ plan: 'free1', status: 'active' });
 * // returns
 * 'SET #plan = :plan AND #status = :status'
 *
 */
module.exports.prepareUpdateExpression = (updates) => {
  const keys = _.isPlainObject(updates) ? Object.keys(updates) : updates;
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
 * TODO is this helpful or too abstract and magical now?
 *
 */
module.exports.prepareUpdate = (updates) => {
  return {
    UpdateExpression: module.exports.prepareUpdateExpression(updates),
    ExpressionAttributeNames: module.exports.prepareAttributeNames(Object.keys(updates)),
    ExpressionAttributeValues: module.exports.prepareAttributeValues(updates)
  }
}
