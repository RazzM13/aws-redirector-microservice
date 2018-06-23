const chai =  require('chai');
const expect = chai.expect;
const proxyquire =  require('proxyquire-2');
const mergeOptions = require('merge-options');

let getItemRequest;
let getItemResponse;
let getItemResolution;
let putItemRequest;
let putItemResponse;
let putItemResolution;
let deleteItemRequest;
let deleteItemResponse;
let deleteItemResolution;

const dbResult = function(response, resolution, cb) {
  this.promise = () => {
    return new Promise((resolve, reject) => {
      if (resolution) {
        resolve(response);
      } else {
        reject(response);
      }
    });
  }
  if (!!cb) {
    cb(null, response);
  }
}

const dbMock = function() {}
dbMock.prototype.getItem = (x, cb) => { getItemRequest = x; return new dbResult(getItemResponse, getItemResolution, cb); };
dbMock.prototype.putItem = (x, cb) => { putItemRequest = x; return new dbResult(putItemResponse, putItemResolution, cb); };
dbMock.prototype.deleteItem = (x, cb) => { deleteItemRequest = x; return new dbResult(deleteItemResponse, deleteItemResolution, cb); };

const index = proxyquire('../index.js', {
  'aws-sdk/clients/dynamodb': dbMock
});
const handler = index.handler;


const sampleEvent = {
  "path": "/r",
  "headers": {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, lzma, sdch, br",
    "Accept-Language": "en-US,en;q=0.8",
    "CloudFront-Forwarded-Proto": "https",
    "CloudFront-Is-Desktop-Viewer": "true",
    "CloudFront-Is-Mobile-Viewer": "false",
    "CloudFront-Is-SmartTV-Viewer": "false",
    "CloudFront-Is-Tablet-Viewer": "false",
    "CloudFront-Viewer-Country": "US",
    "Host": "wt6mne2s9k.execute-api.us-west-2.amazonaws.com",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36 OPR/39.0.2256.48",
    "Via": "1.1 fb7cca60f0ecd82ce07790c9c5eef16c.cloudfront.net (CloudFront)",
    "X-Amz-Cf-Id": "nBsWBOrSHMgnaROZJK1wGCZ9PcRcSpq_oSXZNQwQ10OTZL4cimZo3g==",
    "X-Forwarded-For": "192.168.100.1, 192.168.1.1",
    "X-Forwarded-Port": "443",
    "X-Forwarded-Proto": "https"
  },
  "pathParameters": {
    "id": "hello"
  },
  "requestContext": {
    "accountId": "123456789012",
    "resourceId": "us4z18",
    "stage": "test",
    "requestId": "41b45ea3-70b5-11e6-b7bd-69b5aaebc7d9",
    "identity": {
      "cognitoIdentityPoolId": "",
      "accountId": "",
      "cognitoIdentityId": "",
      "caller": "",
      "apiKey": "",
      "sourceIp": "192.168.100.1",
      "cognitoAuthenticationType": "",
      "cognitoAuthenticationProvider": "",
      "userArn": "",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36 OPR/39.0.2256.48",
      "user": ""
    },
    "resourcePath": "/{proxy+}",
    "httpMethod": "GET",
    "apiId": "wt6mne2s9k"
  },
  "resource": "/{proxy+}",
  "httpMethod": "GET",
  "queryStringParameters": {
    "url": "http://example.com/"
  },
  "stageVariables": {
    "redirectsTableName": "mock"
  }
};

const sampleGetItemResponse = {
  'Item': {
    'id': {
      S: 'hello'
    },
    'url': {
      S: "http://target.example.com/"
    }
  }
};

const samplePutItemResponse = {
  ConsumedCapacity: {
   CapacityUnits: 1,
   TableName: 'mock'
  }
};

const sampleDeleteItemResponse = {
  ConsumedCapacity: {
   CapacityUnits: 1,
   TableName: 'mock'
  }
};


describe('URL Redirector microservice', function() {

  beforeEach(function() {
    getItemRequest = {};
    getItemResponse = {};
    getItemResolution = true;
    putItemRequest = {};
    putItemResponse = {};
    putItemResolution = true;
    deleteItemRequest = {};
    deleteItemResponse = {};
    deleteItemResolution = true;
  });

  describe('#GET', function() {

    it('ID not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'pathParameters': {
          'id': null
        }
      });
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection ID not specified!'}));
        done();
      });
    });

    it('Unregistered ID - should successfully redirect to default URL', function(done) {
      let event = mergeOptions(sampleEvent);
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 301);
        expect(response).to.have.deep.property('headers', {'Location': '/'});
        done();
      });
    });

    it('Registered ID - should successfully redirect to target URL', function(done) {
      let event = mergeOptions(sampleEvent);
      getItemResponse = mergeOptions(sampleGetItemResponse);
      handler(event, {}, (_, response) => {
        expect(getItemRequest).to.deep.equal({
          Key: {
            'id': {
              S: 'hello'
            }
          },
          TableName: 'mock'
        });
        expect(response).to.have.property('statusCode', 302);
        expect(response).to.have.deep.property('headers', {
          'Location': getItemResponse['Item']['url']['S'],
          'Referrer-Policy': 'no-referrer'
        });
        done();
      });
    });

  });

  describe('#POST', function() {

    it('ID not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'POST',
        'requestContext': {
          'httpMethod': 'POST',
        },
        'pathParameters': {
          'id': null
        }
      });
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection ID not specified!'}));
        done();
      });
    });

    it('Duplicate ID - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'POST',
        'requestContext': {
          'httpMethod': 'POST',
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 409);
        expect(response).to.have.property('body', JSON.stringify({
          'error': 'A redirection has already been registered for the specified ID!'})
        );
        done();
      });
    });

    it('Target URL not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'POST',
        'requestContext': {
          'httpMethod': 'POST',
        },
        'queryStringParameters': {
          'url': null
        }
      });
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection target URL not specified!'}));
        done();
      });
    });

    it('Should successfully register redirection', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'POST',
        'requestContext': {
          'httpMethod': 'POST',
        }
      });
      putItemResponse = mergeOptions(samplePutItemResponse);
      handler(event, {}, (_, response) => {
        expect(putItemRequest).to.deep.equal({
          Item: {
            'id': {
              S: event['pathParameters']['id']
            },
            'url': {
              S: event['queryStringParameters']['url']
            }
          },
          TableName: event['stageVariables']['redirectsTableName']
        });
        expect(response).to.have.property('statusCode', 201);
        done();
      });
    });

  });

  describe('#PUT', function() {

    it('ID not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'PUT',
        'requestContext': {
          'httpMethod': 'PUT',
        },
        'pathParameters': {
          'id': null
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection ID not specified!'}));
        done();
      });
    });

    it('Target URL not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'PUT',
        'requestContext': {
          'httpMethod': 'PUT',
        },
        'queryStringParameters': {
          'url': null
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection target URL not specified!'}));
        done();
      });
    });

    it('Unregistered ID - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'PUT',
        'requestContext': {
          'httpMethod': 'PUT',
        }
      });
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 404);
        expect(response).to.have.property('body', JSON.stringify({'error': 'No redirection registered for the specified ID!'}));
        done();
      });
    });

    it('Should successfully update redirection', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'PUT',
        'requestContext': {
          'httpMethod': 'PUT',
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      putItemResponse = mergeOptions(samplePutItemResponse);
      handler(event, {}, (_, response) => {
        expect(putItemRequest).to.deep.equal({
          Item: {
            'id': {
              S: event['pathParameters']['id']
            },
            'url': {
              S: event['queryStringParameters']['url']
            }
          },
          TableName: event['stageVariables']['redirectsTableName']
        });
        expect(response).to.have.property('statusCode', 200);
        done();
      });
    });

  });

  describe('#DELETE', function() {

    it('ID not specified - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'DELETE',
        'requestContext': {
          'httpMethod': 'DELETE',
        },
        'pathParameters': {
          'id': null
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 400);
        expect(response).to.have.property('body', JSON.stringify({'error': 'Redirection ID not specified!'}));
        done();
      });
    });

    it('Unregistered ID - should return error', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'DELETE',
        'requestContext': {
          'httpMethod': 'DELETE',
        },
        'queryStringParameters': {
          'url': null
        }
      });
      getItemResolution = false;
      handler(event, {}, (_, response) => {
        expect(response).to.have.property('statusCode', 404);
        expect(response).to.have.property('body', JSON.stringify({'error': 'No redirection registered for the specified ID!'}));
        done();
      });
    });

    it('Should successfully remove redirection', function(done) {
      let event = mergeOptions(sampleEvent, {
        'httpMethod': 'DELETE',
        'requestContext': {
          'httpMethod': 'DELETE',
        }
      });
      getItemResponse = mergeOptions(sampleGetItemResponse);
      deleteItemResponse = mergeOptions(sampleDeleteItemResponse);
      handler(event, {}, (_, response) => {
        expect(deleteItemRequest).to.deep.equal({
          Key: {
            'id': {
              S: event['pathParameters']['id']
            }
          },
          TableName: event['stageVariables']['redirectsTableName']
        });
        expect(response).to.have.property('statusCode', 200);
        done();
      });
    });
  });

});
