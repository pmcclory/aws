'use strict';

const chai = require('chai');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

chai.use(require('chai-sinon'));
chai.use(require('chai-as-promised'));

describe('CloudSearch', function() {
  let awsMock, configMock, CloudSearch, csStub;

  beforeEach(function() {
    csStub = sinon.stub();

    configMock = {};

    awsMock = {
      CloudSearchDomain: class {
        constructor(config) {
          csStub(config);
          return {
            fooAsync: sinon.stub()
          };
        }
      }
    };
    CloudSearch = proxyquire('../../../lib/cloudsearch', {
      './client-config': configMock,
      'aws-sdk': awsMock
    });
  });

  it('should return a client with promisified functions', function() {
    const client = new CloudSearch().client;
    expect(client).to.have.property('fooAsync');
  });

  it('should return the config property set to the passed config', function() {
    const config = new CloudSearch({ foo: 'bar' }).config;
    expect(config).to.have.property('foo');
    expect(config.foo).to.equal('bar');
  });

  it('should merge the local config with the global config', function() {
    configMock.foo = 'bar';
    new CloudSearch({ bat: 'baz' });

    expect(csStub.args[0][0]).to.deep.equal({ foo: 'bar', bat: 'baz' });
  });

  it('should override global config with passed config', function() {
    configMock.foo = 'bar';
    new CloudSearch({ foo: 'baz' });

    expect(csStub.args[0][0]).to.deep.equal({ foo: 'baz' });
  });
});
