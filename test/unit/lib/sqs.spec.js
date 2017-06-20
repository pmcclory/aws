'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
require('sinon-as-promised')(require('bluebird'));

describe('SQS Utilities', function() {
  let SQS
    , sqsMock
    , result
    , testConfig
    , awsMock
    , queueUrl;

  beforeEach(function() {
    result = 'result';

    testConfig = {
      account: 'Stark',
      queuePrefix: 'etl_',
      queueSuffix: '_ending'
    };

    sqsMock = {
      sendMessage: sinon.stub().yields(null, result),
      changeMessageVisibility: sinon.stub().yields(null, result),
      purgeQueue: sinon.stub().yields(null, result),
      deleteMessageBatch: sinon.stub().yields(null, result),
      receiveMessage: sinon.stub().yields(null, result)
    };

    awsMock = {
      config: {
        region: 'Winterfel',
        visibilityTimeout: 42
      },
      SQS: class {
        constructor() { return sqsMock; }
      }
    };

    // url for a queue named "queue"
    queueUrl = 'https://sqs.Winterfel.amazonaws.com/Stark/etl_queue_ending';

    SQS = proxyquire('../../../lib/sqs', {
      'aws-sdk': awsMock
    })(testConfig);
  });

  it('should return a queue name', function() {
    expect(SQS.getQueueURL('webhooks')).to.equal('https://sqs.Winterfel.amazonaws.com/Stark/etl_webhooks_ending');
  });

  it('should send a message', function() {

    return SQS.send({ queueName: 'queue', payload: 'payload', attrs: { foo: 'bar' } })
      .then((res) => {
        expect(res).to.equal(result);
        expect(sqsMock.sendMessage.callCount).to.equal(1);
        expect(sqsMock.sendMessage.args[0][0]).to.deep.equal({
          MessageBody: 'payload',
          QueueUrl: queueUrl,
          MessageAttributes: { foo: 'bar' }
        });
      });
  });

  it('should purge a queue', function() {

    return SQS.purge({ queueName: 'queue' })
      .then((res) => {
        expect(res).to.equal(result);
        expect(sqsMock.purgeQueue.callCount).to.equal(1);
        expect(sqsMock.purgeQueue.args[0][0]).to.deep.equal({
          QueueUrl: queueUrl
        });
      });
  });

  it('should change a message visibility timeout on an object', function() {
    return SQS.setVizTimeout({ queueName: 'queue', handle: 'handle', timeout: 'timeout' })
      .then((res) => {
        expect(res).to.equal(result);
        expect(sqsMock.changeMessageVisibility.callCount).to.equal(1);
        expect(sqsMock.changeMessageVisibility.args[0][0]).to.deep.equal({
          QueueUrl: queueUrl,
          ReceiptHandle: 'handle',
          VisibilityTimeout: 'timeout'
        });
      });
  });

  it('should retrieve messages', function() {

    return SQS.retrieve({ queueName: 'queue' })
      .then((res) => {
        expect(res).to.equal('result');
        expect(sqsMock.receiveMessage.callCount).to.equal(1);
        expect(sqsMock.receiveMessage.args[0][0]).to.deep.equal({
          MaxNumberOfMessages: 10,
          QueueUrl: queueUrl,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 42,
          MessageAttributeNames: []
        });
      });
  });

  it('should retrieve messages with attributes', function() {

    return SQS.retrieve({ queueName: 'queue', messageAttributeNames: ['sp_batch_id'] })
      .then((res) => {
        expect(res).to.equal('result');
        expect(sqsMock.receiveMessage.callCount).to.equal(1);
        expect(sqsMock.receiveMessage.args[0][0]).to.deep.equal({
          MaxNumberOfMessages: 10,
          QueueUrl: queueUrl,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 42,
          MessageAttributeNames: ['sp_batch_id']
        });
      });
  });

  it('should retrieve 1 message', function() {

    return SQS.retrieve({ queueName: 'queue', max: 1 })
      .then((res) => {
        expect(res).to.equal('result');
        expect(sqsMock.receiveMessage.callCount).to.equal(1);
        expect(sqsMock.receiveMessage.args[0][0]).to.deep.equal({
          MaxNumberOfMessages: 1,
          QueueUrl: queueUrl,
          WaitTimeSeconds: 20,
          VisibilityTimeout: 42,
          MessageAttributeNames: []
        });
      });
  });

  it('should remove messages', function() {

    const entries = [{ Id: 1, foo: 'bar' }, { Id: 1, foo: 'baz' }, { Id: 2, foo: 'bat' }];

    return SQS.remove({ queueName: 'queue', entries })
      .then((res) => {
        expect(res).to.equal('result');
        expect(sqsMock.deleteMessageBatch.callCount).to.equal(1);
        expect(sqsMock.deleteMessageBatch.args[0][0]).to.deep.equal({
          Entries: [{ Id: 1, foo: 'bar' }, { Id: 2, foo: 'bat' }],
          QueueUrl: queueUrl
        });
      });
  });

});
