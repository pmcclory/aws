'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('Dynamo wrappper', function() {
  let awsMock
    , dynamo
    , stub;

  beforeEach(function() {
    stub = sinon.stub();

    awsMock = {
      config: {
        region: 'Winterfel'
      },
      DynamoDB: {
        DocumentClient: class {
          constructor(config) { console.log(stub); stub(config); }
        }
      }
    };

    dynamo = proxyquire('../../../lib/dynamo', {
      'aws-sdk': awsMock
    });
  });

  describe("Constructor", function() {
    it("should override proxy settings", function() {
      var d = new dynamo({ 'httpOptions': { 'agent': "proxy", 'otherSetting': "this should stay" }});
      //console.log(stub);
      expect(stub).to.have.been.calledWith({ httpOptions: {agent: undefined, otherSetting: "this should stay"} });
    });
  });
});
