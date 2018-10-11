/* eslint id-length: "off" */
'use strict';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const utils = require('../../../lib/utils');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('AWS Library utilities', function() {
  const testCases = [
    [
      'should compute string value byte length',
      'abcde',
      { a: { StringValue: 'c' } },
      10
    ],
    [
      'should compute string list value byte length',
      'abcde',
      { a: { StringListValues: ['a', 'b', 'c', 'd'] } },
      13
    ],
    [
      'should compute binary value byte length',
      'abcde',
      { a: { BinaryValue: '\u0010\u00a0' } },
      11
    ],
    [
      'should compute binary list value byte length',
      'abcde',
      { a: { BinaryListValues: ['\u0010\u00a0', '\u0010\u00a0'] } },
      13
    ]
  ];

  testCases.forEach(function([testCase, body, attrs, expectedValue]) {
    it(testCase, function() {
      return expect(utils.computeMessageSize(body, attrs)).to.equal(
        expectedValue
      );
    });
  });

  it('should allow for promisifying an object with async methods', function() {
    const badAmazon = {
      onAsyncWhyAmazon: sinon.stub().resolves(true),
      callbackExample(cb) {
        return cb(null, true);
      }
    };

    utils.promisify(badAmazon);
    return badAmazon
      .onAsyncWhyAmazon()
      .then((ret) => expect(ret).to.be.true)
      .then(() => badAmazon.callbackExampleAsync())
      .then((ret) => expect(ret).to.be.true);
  });

  it('should support setting up a keepalive agent through config', function() {
    const awsMock = sinon.stub();

    utils.setHttpAgent({}, true, awsMock);
    expect(awsMock).to.have.been.calledWithMatch({
      httpOptions: { agent: sinon.match.any }
    });
  });

  it('should default to not setting up http keepalives', function() {
    const awsMock = sinon.stub();

    utils.setHttpAgent(undefined, undefined, awsMock);
    expect(awsMock).to.have.been.calledWithMatch({});
  });
});
