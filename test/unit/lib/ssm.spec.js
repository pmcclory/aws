'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));

describe('SSM tests', function() {
  let awsMock, configMock, SSM, ssmStub;

  beforeEach(function() {
    ssmStub = sinon.stub();

    configMock = {};

    awsMock = {
      SSM: class {
        constructor(config) {
          ssmStub(config);
          return {
            getParametersAsync: sinon.stub()
          };
        }
      }
    };
    SSM = proxyquire('../../../lib/ssm', {
      './client-config': configMock,
      'aws-sdk': awsMock
    });
  });

  it('should return a client with promisified functions', function() {
    const client = new SSM().client;
    expect(client).to.have.property('getParametersAsync');
  });

  it('should return the config property set to the passed config', function() {
    const { config } = new SSM({ foo: 'bar' });
    expect(config).to.have.property('foo');
    expect(config.foo).to.equal('bar');
  });

  it('should merge the local config with the global config', function() {
    configMock.foo = 'bar';
    new SSM({ bat: 'baz' });

    expect(ssmStub).to.have.been.calledWith({ foo: 'bar', bat: 'baz' });
  });

  it('should override global config with passed config', function() {
    configMock.foo = 'bar';
    new SSM({ foo: 'baz' });

    expect(ssmStub).to.have.been.calledWith({ foo: 'baz' });
  });
});
