'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('Dynamo wrappper', function() {
  let awsMock
    , Dynamo
    , stub;

  beforeEach(function() {
    stub = sinon.stub();

    awsMock = {
      config: {
        region: 'Winterfel'
      },
      DynamoDB: {
        DocumentClient: class {
          constructor(config) { stub(config); }
        }
      }
    };

    Dynamo = proxyquire('../../../lib/dynamo', {
      'aws-sdk': awsMock
    });
  });

  describe('Constructor', function() {

    it('should override proxy settings', function() {
      new Dynamo({ httpOptions: { agent: 'proxy', otherSetting: 'this should stay' }});
      expect(stub).to.have.been.calledWith({ httpOptions: {otherSetting: 'this should stay'} });
    });

    it('should create an empty config if no config passed', function() {
      new Dynamo();
      expect(stub).to.have.been.calledWith({ });
    });

    it('should retain proxy settings if config.bypassProxy is false', function() {
      new Dynamo({ httpOptions: { agent: 'proxy' }, bypassProxy: false});
      expect(stub).to.have.been.calledWith({ httpOptions: { agent: 'proxy' }, bypassProxy: false });
    });
  });
});
