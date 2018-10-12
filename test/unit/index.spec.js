'use strict';

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const proxyquire = require('proxyquire').noCallThru();
const clientConfig = require('lib/client-config');

describe('AWS Constructor tests', function() {
  let awsWrapper, dynamoStub, snsStub, sqsStub, csStub, sdkStub, proxyStub;

  beforeEach(function() {
    proxyStub = sinon.stub().returns('my-proxy-server');
    dynamoStub = sinon.stub();
    snsStub = sinon.stub();
    sqsStub = sinon.stub();
    csStub = sinon.stub();
    sdkStub = {
      config: { update: sinon.stub() }
    };

    awsWrapper = proxyquire('../../index', {
      './lib/dynamo': dynamoStub,
      './lib/sns': snsStub,
      './lib/sqs': sqsStub,
      './lib/cloudsearch': csStub,
      'aws-sdk': sdkStub,
      'proxy-agent': proxyStub
    });
  });

  it('should return wrapped SDK methods', function() {
    expect(awsWrapper.DynamoDB).to.equal(dynamoStub);
    expect(awsWrapper.SNS).to.equal(snsStub);
    expect(awsWrapper.SQS).to.equal(sqsStub);
    expect(awsWrapper.CloudSearch).to.equal(csStub);
    expect(awsWrapper.SDK).to.equal(sdkStub);
  });

  it('should initialize with proxy if passed in as config', function() {
    awsWrapper.initialize({
      proxy: 'my-proxy-server'
    });
    expect(proxyStub).to.have.been.calledWith('my-proxy-server');
    expect(clientConfig).to.deep.equal({
      httpOptions: { agent: 'my-proxy-server' }
    });
  });

  it('should configure common keys in initialize', function() {
    awsWrapper.initialize({
      accessKeyId: 'key',
      secretAccessKey: 'access',
      region: 'region',
      extra: 'key'
    });

    expect(sdkStub.config.update).to.have.been.calledWith({
      accessKeyId: 'key',
      secretAccessKey: 'access',
      region: 'region'
    });
  });
});
