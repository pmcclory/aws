'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('Dynamo wrappper', function() {
  let awsMock
    , httpsMock
    , httpsAgentMock
    , Dynamo
    , stub;

  beforeEach(function() {
    stub = sinon.spy();

    httpsAgentMock = sinon.stub().returns('fake agent!');
    httpsMock = {
      Agent: class {
        constructor(args) {
          httpsAgentMock(args);
        }
      }
    };

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
      'aws-sdk': awsMock,
      'https': httpsMock
    });
  });

  describe('Constructor', function() {

    it('should remove agent configuration when not using proxies or keepalive', function() {
      let config = {
        bypassProxy: true,
        useKeepalives: false,
        httpOptions: {
          agent: 'proxy',
          otherSetting: 'this should stay'
        }
      };
      new Dynamo(config);
      delete config.httpOptions.agent;
      expect(stub).to.have.been.calledWith({ httpOptions: { otherSetting: 'this should stay'} });
    });

    it('should create an empty config if no config passed when bypassing proxy and not using keepalives', function() {
      let config = {
        bypassProxy: true,
        useKeepalives: false
      };
      new Dynamo(config);
      expect(stub).to.have.been.calledWith({ httpOptions: {} });
    });

    it('should retain proxy settings if config.bypassProxy is false and not using keepalives', function() {
      let config = {
        useKeepalives: false,
        bypassProxy: false,
        httpOptions: {
          agent: 'proxy'
        }
      };
      new Dynamo(config);
      expect(stub).to.have.been.calledWith({ httpOptions: { agent: 'proxy' }});
    });

    it('should throw an error if attempting to use keepalives and a proxy', function() {
      let config = {
        useKeepalives: true,
        bypassProxy: false
      };
      expect(() => new Dynamo(config)).to.throw('Can\'t use keepalives while using a proxy!');
    });

    it('will default to using keepalives and bypassing proxy configuration', function() {
      new Dynamo({});
      expect(httpsAgentMock).to.have.been.calledWith({
        keepAlive: true,
        rejectUnauthorized: true,
        maxSockets: 50
      });
      expect(stub.getCall(0).args[0].httpOptions.agent).to.be.an.instanceof(httpsMock.Agent);
    });
 });
});
