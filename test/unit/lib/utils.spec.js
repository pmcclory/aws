'use strict';

const chai = require('chai');
const expect = chai.expect;
const utils = require('../../../lib/utils');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('AWS Library utilities', function() {
  const testCases = [
    ['should compute string value byte length', 'abcde', { a: { StringValue: 'c' }}, 10],
    ['should compute string list value byte length', 'abcde', { a: { StringListValues: ['a', 'b', 'c', 'd'] }}, 13],
    ['should compute binary value byte length', 'abcde', { a: { BinaryValue: '\u0010\u00a0' }}, 11],
    ['should compute binary list value byte length', 'abcde', { a: { BinaryListValues: ['\u0010\u00a0', '\u0010\u00a0'] }}, 13]
  ];

  testCases.forEach(function([testCase, body, attrs, expectedValue]) {
    it(testCase, () => expect(utils.computeMessageSize(body, attrs)).to.equal(expectedValue));
  });
});
