'use strict';

const chai = require('chai');
const expect = chai.expect;
const helpers = require('../../../lib/dynamo-helpers');

describe('Dynamo Helpers', function() {
  let testHash;

  beforeEach(function() {
    testHash = {
      plan: '100K',
      status: 'suspended'
    };
  });

  it('should prepare the key replacements for a dynamo expression (ExpressionAttributeNames)', function() {
    const fields = Object.keys(testHash);
    expect(helpers.prepareAttributeNames(fields)).to.deep.equal({
      '#plan': 'plan',
      '#status': 'status'
    });
  });

  it('should prepare the value replacements for a dynamo expression (ExpressionAttributeValues)', function() {
    expect(helpers.prepareAttributeValues(testHash)).to.deep.equal({
      ':plan': '100K',
      ':status': 'suspended'
    });
  });

  it('should prepare an update expression from an array of keys', function() {
    const keysList = Object.keys(testHash);
    expect(helpers.prepareUpdateExpression(keysList)).to.equal(
      'SET #plan = :plan, #status = :status'
    );
  });

  it('should prepare an update for dynamo', function() {
    expect(helpers.prepareUpdate(testHash)).to.deep.equal({
      UpdateExpression: 'SET #plan = :plan, #status = :status',
      ExpressionAttributeNames: {
        '#plan': 'plan',
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':plan': '100K',
        ':status': 'suspended'
      }
    });
  });
});
