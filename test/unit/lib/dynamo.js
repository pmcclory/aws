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
      query: sinon.stub(),
      scan: sinon.stub()
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
    dynamoInstance.queryAsync = sinon.stub().resolves({ Items: dynamoItems });
    dynamoInstance.scanAsync = sinon.stub().resolves({ Items: dynamoItems });
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

  describe('queryAllPager', function() {
    it('should page when there is a last evaluated key and pass the items to the pager ', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: [1], LastEvaluatedKey: '2' });
      dynamoMock.queryAsync.onCall(1).resolves({ Items: [2] });
      const pagerCallback = sinon.stub().resolves();

      return dynamoInstance.queryAllPager({ TableName: 'test' }, pagerCallback).then(() => {
        expect(dynamoMock.queryAsync.callCount).to.equal(2);
        expect(pagerCallback.callCount).to.equal(2);
        expect(pagerCallback.args[0][0][0]).to.equal(1); // first page
        expect(pagerCallback.args[1][0][0]).to.equal(2); // second page
      });
    });

    it('should not page when there isn\'t a last evaluated key', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: [1] });
      const pagerCallback = sinon.stub().resolves();

      return dynamoInstance.queryAllPager({ TableName: 'test' }, pagerCallback).then(() => {
        expect(dynamoMock.queryAsync.callCount).to.equal(1);
        expect(pagerCallback.callCount).to.equal(1);
        expect(pagerCallback.args[0][0][0]).to.equal(1); // first page
      });
    });

    it('should handle no items being returned', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ });
      const pagerCallback = sinon.stub().resolves();

      return dynamoInstance.queryAllPager({ TableName: 'test' }, pagerCallback).then(() => {
        expect(dynamoMock.queryAsync.callCount).to.equal(1);
        expect(pagerCallback.callCount).to.equal(1);
        expect(pagerCallback.args[0][0].length).to.equal(0); // first page
      });
    });

    it('should reject if one of the pager callbacks does', function() {
      dynamoMock.queryAsync.onCall(0).resolves({ Items: [1] });
      const pagerCallback = sinon.stub().rejects();

      return expect(dynamoInstance.queryAllPager({ TableName: 'test' }, pagerCallback)).to.be.rejected.then(() => {
        expect(dynamoMock.queryAsync.callCount).to.equal(1);
        expect(pagerCallback.callCount).to.equal(1);
        expect(pagerCallback.args[0][0][0]).to.equal(1); // first page
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
