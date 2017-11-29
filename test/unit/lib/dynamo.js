'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('Dynamo', function() {
  let Dynamo
    , dynamoInstance
    , dynamoItems
    , dynamoMock
    , awsMock;

  beforeEach(function() {
    dynamoItems = ['one', 'two', 'three', 'four'];

    dynamoMock = {
      queryAsync: sinon.stub().resolves({ Items: dynamoItems }),
      scanAsync: sinon.stub().resolves({ Items: dynamoItems })
    };

    awsMock = {
      config: {
        region: 'Winterfel'
      },
      DynamoDB: {
        DocumentClient: class {
          constructor() { return dynamoMock; }
        }
      }
    };

    Dynamo = proxyquire('../../../lib/dynamo', {
      'aws-sdk': awsMock
    });

    dynamoInstance = new Dynamo().client;
  });

  describe('queryAll', function() {
    it('should return all items from a single page query', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: dynamoItems });
      dynamoMock.queryAsync.onCall(1).rejects();

      return dynamoInstance.queryAll({ TableName: 'test' })
        .then((items) => {
          expect(items).to.deep.equal(dynamoItems);
          expect(dynamoMock.queryAsync).to.have.been.calledOnce;
        });
    });

    it('should return all items from a multi page query', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: dynamoItems, LastEvaluatedKey: '2' });
      dynamoMock.queryAsync.onCall(1).resolves({ Items: dynamoItems });

      return dynamoInstance.queryAll({ TableName: 'test' })
        .then((items) => {
          expect(items.length).to.equal(dynamoItems.length * 2);
          expect(dynamoMock.queryAsync).to.have.been.calledTwice;
        });
    });

    it('should handle empty pages', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: dynamoItems, LastEvaluatedKey: '2' });
      dynamoMock.queryAsync.onCall(1).resolves({ });

      return dynamoInstance.queryAll({ TableName: 'test' })
        .then((items) => {
          expect(items.length).to.equal(dynamoItems.length);
          expect(dynamoMock.queryAsync).to.have.been.calledTwice;
        });
    });
  });

  describe('scanAll', function() {
    it('should return all items from a single page scan', function() {
      dynamoMock.scanAsync.onCall(0).resolves({ Items: dynamoItems });
      dynamoMock.scanAsync.onCall(1).rejects();

      return dynamoInstance.scanAll({ TableName: 'test' })
        .then((items) => {
          expect(items).to.deep.equal(dynamoItems);
          expect(dynamoMock.scanAsync).to.have.been.calledOnce;
        });
    });

    it('should return all items from a multi page scan', function() {
      dynamoMock.scanAsync.onCall(0).resolves({ Items: dynamoItems, LastEvaluatedKey: '2' });
      dynamoMock.scanAsync.onCall(1).resolves({ Items: dynamoItems });

      return dynamoInstance.scanAll({ TableName: 'test' })
        .then((items) => {
          expect(items.length).to.equal(dynamoItems.length * 2);
          expect(dynamoMock.scanAsync).to.have.been.calledTwice;
        });
    });

    it('should handle empty pages', function() {
      dynamoMock.scanAsync.onCall(0).resolves({ Items: dynamoItems, LastEvaluatedKey: '2' });
      dynamoMock.scanAsync.onCall(1).resolves({ });

      return dynamoInstance.scanAll({ TableName: 'test' })
        .then((items) => {
          expect(items.length).to.equal(dynamoItems.length);
          expect(dynamoMock.scanAsync).to.have.been.calledTwice;
        });
    });
  });
});
