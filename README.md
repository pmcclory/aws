# aws
Thin wrappers around the aws-sdk libraries we use.

### DynamoDB

Get an instance of [the DynamoDB DocumentClient](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html), stored as `client` on a `DynamoDB` instance. All methods described in the docs are available.

To set up the lib:

```javascript
const aws = require('@sparkpost/aws')
const config = {
  region: "us-west-2",
  accessKeyId: "<aws access key>",
  secretAccessKey: "<aws secret access key>",
  account: 1234567890 // aws account id integer
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
