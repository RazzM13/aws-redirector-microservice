const DynamoDB = require('aws-sdk/clients/dynamodb');
const db = new DynamoDB({apiVersion: '2012-08-10'});

exports.handler = (event, context, callback) => {
    let response = {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': {},
        'body': ''
    };
    let redirectID = event['pathParameters']['id'];
    let redirectURL = event['queryStringParameters']['url'];
    let redirectsTableName = event['stageVariables']['redirectsTableName'];

    if (!redirectID) {
      response['body'] = {
        'error': 'Redirection ID not specified!'
      };
      return callback(null, response);
    }

    return db.getItem({
      Key: {
        'id': {
          S: redirectID
        }
      },
      TableName: redirectsTableName
    }).promise().then((data) => {
      return new Promise((resolve, reject) => {
        let item = data['Item'];
        switch (event['httpMethod']) {
          case 'GET':
            if (!!item) {
              response['headers']['Location'] = item['url'];
              response['statusCode'] = 302;
            } else {
              response['headers']['Location'] = '/';
              response['statusCode'] = 301;
            }
            return resolve(response);
            break;
          case 'POST':
            if (!item && !!redirectURL) {
              return db.putItem({
                Item: {
                  'id': {
                    S: redirectID
                  },
                  'url': {
                    S: redirectURL
                  }
                },
                TableName: redirectsTableName
              }).promise()
              .then(() => {
                response['statusCode'] = 201;
                resolve(response);
              })
              .catch((e) => {
                reject(e);
              });
            } else {
              if (!!item) {
                response['statusCode'] = 409;
                response['body'] = {
                  'error': 'A redirection has already been registered for specified ID!'
                };
                return reject(response);
              }
              if (!redirectURL) {
                response['statusCode'] = 400;
                response['body'] = {
                  'error': 'Redirection target URL not specified!'
                };
                return reject(response);
              }
            }
            break;
          case 'PUT':
            if (!!item && !!redirectURL) {
              return db.putItem({
                Item: {
                  'id': {
                    S: redirectID
                  },
                  'url': {
                    S: redirectURL
                  }
                },
                TableName: redirectsTableName
              }).promise()
              .then(() => {
                response['statusCode'] = 200;
                resolve(response);
              })
              .catch((e) => {
                reject(e);
              });
            } else {
              if (!item) {
                response['statusCode'] = 404;
                response['body'] = {
                  'error': 'No redirection registered for specified ID!'
                };
                return reject(response);
              }
              if (!redirectURL) {
                response['statusCode'] = 400;
                response['body'] = {
                  'error': 'Redirection target URL not specified!'
                };
                return reject(response);
              }
            }
            break;
          case 'DELETE':
            if (!!item) {
              return db.deleteItem({
                Key: {
                  'id': {
                    S: redirectID
                  }
                },
                TableName: redirectsTableName
              }).promise()
              .then(() => {
                response['statusCode'] = 200;
                resolve(response);
              })
              .catch((e) => {
                reject(e);
              });
            } else {
              if (!item) {
                response['statusCode'] = 404;
                response['body'] = {
                  'error': 'No redirection registered for specified ID!'
                };
                return reject(response);
              }
            }
            break;
          default:
            reject('Invalid HTTP method!');
            break;
        }
      });
    })
    .then((response) => {
      callback(null, response);
    })
    .catch((response) => {
      callback(null, response);
    });
};
