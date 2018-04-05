# aws
Thin wrappers around the aws-sdk libraries we use.

### Initialization

Rather than having to assemble all the necessary connection config in every file that needs aws services, this wrapper provides a simple way to set up the AWS credentials in one place, one time for the whole service. This also allows the service to remove this initialization step later in favor of ENV_VAR or instance profile auth management, if possible.

For example, in app.js:

```javascript
'use strict';

const AWS = require('@sparkpost/aws');
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

### AWS SDK Client

If you want access to the raw `aws-sdk` client you can use the `SDK` property.

```js
const AWS = require('@sparkpost/aws');
const marketplaceMeteringService = new AWS.SDK.MarketplaceMetering({ apiVersion: '2016-01-14' });
marketplaceMeteringService.resolveCustomer({ RegistrationToken: token }, (err, data) => { ... });
```

### DynamoDB (Document Client)

Get an instance of [the DynamoDB DocumentClient](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html), stored as `client` on a `DynamoDB` instance. All methods described in the docs are available.

To set up the lib:

```javascript
const aws = require('@sparkpost/aws')
const ddb = new aws.DynamoDB().client // DynamoDB() constructor takes optional Document Client config object if necessary
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

The client has been "promisified" using [Bluebird's `promisifyAll` method](http://bluebirdjs.com/docs/api/promise.promisifyall.html) to attach promise-versions of all available methods, which are then available at `<methodName>Async`.

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

### SNS

To get an instance of the SNS wrapper:

```js
const sns = require('@sparkpost/aws').SNS({ 
  account: 'abc123', 
  arnSuffix: '-prd', 
  defaultSubject: 'some message subject'
});
```

`account` is required. `arnSuffix` and `defaultSubject` default to the empty string.

The SNS topic ARN will be contructed as `arn:aws:sns:${AWS.config.region}:${account}:sns-${topicName}${arnSuffix}`

#### Publishing a Message

You can publish a messge to an SNS topic using the promisified `publish` method:

```js
sns.publish({message, topicName, subject})
  .then(() => console.log('published!'))
  .catch((err) => console.log(err)));
```

`message` will be stringified if it is not already a String. `subject` is optional and will default to `defaultSubject` set in the constructor.

### SQS

To get an instance of the SQS wrapper:

```js
const sqs = require('@sparkpost/aws').SQS({ 
  account: 'abc123', 
  queuePrefix: 'sqs-', 
  queueSuffix: '-prd',
  defaultVisibilityTimeout: 301
});
```

`account` is required and is the AWS account ID.

`queuePrefix` and `queueSuffix` are optional and default to the empty string. They are used in constructing the SQS queue URL.

`defaultVisibilityTimeout` is optional and defaults to 300s. It sets the VisibilityTimeout value when retrieving messgaes from a queue.


#### getQueueURL

Returns the queue url used by this instance.

```js
const url = sqs.getQueueUrl(queueName);
```

#### purge

Purges the queue of messages.

```js
sqs.purge(queueName)
  .then(() => console.log('purged!'))
  .catch((err) => console.log(err)));
```

#### remove

Removes a batch of messages from the queue

```js
sqs.remove({ queueName, entries })
  .then(() => console.log('removed!'))
  .catch((err) => console.log(err)));
```

#### retrieve

Retrieves a batch of messages from the queue.

`max` defaults to 10, `messageAttributeNames` defaults to an empty array.

```js
sqs.retrieve({ queueName, max, messageAttributeNames, visibilityTimeout })
  .then(() => console.log('retrieved!'))
  .catch((err) => console.log(err)));
```

#### send

Sends a message to the queue.

```js
sqs.send({ queueName, payload, attrs })
  .then(() => console.log('sent!'))
  .catch((err) => console.log(err)));
```

#### setVizTimeout

Changes the visibility timeout of a handle.

```js
sqs.setVizTimeout({ queueName, handle, timeout })
  .then(() => console.log('setVizTimeout-ed!'))
  .catch((err) => console.log(err)));
```

### CloudSearch (CloudSearch Domain)

Get an instance of [the CloudSearch Domain API](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudSearchDomain.html), stored as `client` on a `CloudSearch` instance. All methods described in the docs are available as Bluebird promisified versions (search becomes searchAsync, for example).

To set up the lib:

```javascript
const aws = require('@sparkpost/aws');
const cs = new aws.CloudSearch({endpoint: "https://search-my-cs-domain-url.com}).client;
```

Note that for some strange reason, it is _required_ that you pass the CloudSearch endpoint parameter in as part of the instantiation of a new client (which is documented [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudSearchDomain.html#constructor-property)
