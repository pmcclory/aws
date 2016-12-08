# aws
Thin wrappers around the aws-sdk libraries we use.

### Initialization

Rather than having to assemble all the necessary connection config in every file that needs aws services, this wrapper provides a simple way to set up the AWS credentials in one place, one time for the whole service. This also allows the service to remove this initialization step later in favor of ENV_VAR or instance profile auth management, if possible.

For example, in app.js:

```javascript
'use strict';

const AWS = require('@sparkpost/aws');
const passwords = require('@sparkpost/msys-passwords');
const config = require('@sparkpost/msys-config');
// ... whatever else you need, besides the actual models etc. that use aws

/*
 * This needs to occur before the resources module tree is required
 * because the AWS module needs to be globally configured before any
 * usage / instantiation can occur.
 */
if (config.get('aws.enabled') && config.get('aws.enabled') === true) {
  AWS.initialize({
    accessKeyId: config.get('aws.accessKeyId'),
    secretAccessKey: passwords.maybeDecrypt(config.get('aws.secretAccessKey')),
    region: config.get('aws.region'),
    proxy: process.env.HTTPS_PROXY
  });
}

// the files that use aws are required *after* the setup (note: better auth strategies might avoid this order-dependencies in the future)
const resources = require('./resources');
```

### DynamoDB (Document Client)

Get an instance of [the DynamoDB DocumentClient](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html), stored as `client` on a `DynamoDB` instance. All methods described in the docs are available.

To set up the lib:

```javascript
const aws = require('@sparkpost/aws')
const config = {
  // document client config
}
const ddb = new aws.DynamoDB(config).client
```

Regular callback usage:

```javascript
const getParams = {
  TableName: 'some_table',
  Key: {
    my_partition_key: 'abc;123'
  }
}

ddb.get(getParams, (err, result) => {
  if (err) return console.log('error', err)
  console.log('success', result)
})
```

The client has also been "promisified" using [Bluebird's `promisifyAll` method](http://bluebirdjs.com/docs/api/promise.promisifyall.html) to attach promise-versions of all available methods, which are then available at `<methodName>Async`.

Promise usage:

```javascript
const getParams = {
  TableName: 'some_table',
  Key: {
    my_partition_key: 'abc;123'
  }
}

ddb.getAsync(getParams)
  .then((result) => console.log('success', result))
  .catch((err) => console.log('error', err))
```
