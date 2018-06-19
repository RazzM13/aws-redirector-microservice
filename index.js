const DynamoDB = require('aws-sdk/clients/dynamodb');
const db = new DynamoDB({apiVersion: '2012-08-10'});

exports.handler = (event, context, callback) => {
    let response = {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': {},
        'body': ''
    };

    let redirectID;
    let redirectURL;
    let redirectsTableName;

    const sendResponse = (response) => {
      callback(null, response);
    };

    // validate stageVariables
    if (!event.hasOwnProperty('stageVariables') ||
        !event['stageVariables'].hasOwnProperty('redirectsTableName') ||
        !event['stageVariables']['redirectsTableName']) {

      response['body'] = {
        'error': 'Redirections table name not specified!'
      };
      return sendResponse(response);
    }
    redirectsTableName = event['stageVariables']['redirectsTableName'];

    // validate pathParameters
    if (!event.hasOwnProperty('pathParameters') ||
        !event['pathParameters'].hasOwnProperty('id') ||
        !event['pathParameters']['id']) {

      response['body'] = {
        'error': 'Redirection ID not specified!'
      };
      return sendResponse(response);
    }
    redirectID = event['pathParameters']['id'];

    // validate queryStringParameters
    if (event.hasOwnProperty('queryStringParameters') &&
        event['queryStringParameters'].hasOwnProperty('url') &&
        !!event['queryStringParameters']['url']) {

      redirectURL = event['queryStringParameters']['url'];
    }

    const processRequest = (err, data) => {
        let item = null;
        if (!!data && data.hasOwnProperty('Item')) {
          item = data['Item'];
        }
        switch (event['httpMethod']) {
          case 'GET':
            if (!!item) {
              response['headers']['Location'] = item['url'];
              response['statusCode'] = 302;
            } else {
              response['headers']['Location'] = '/';
              response['statusCode'] = 301;
            }
            return sendResponse(response);
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
                sendResponse(response);
              })
              .catch((e) => {
                sendResponse(e);
              });
            } else {
              if (!!item) {
                response['statusCode'] = 409;
                response['body'] = {
                  'error': 'A redirection has already been registered for specified ID!'
                };
                return sendResponse(response);
              }
              if (!redirectURL) {
                response['statusCode'] = 400;
                response['body'] = {
                  'error': 'Redirection target URL not specified!'
                };
                return sendResponse(response);
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
                sendResponse(response);
              })
              .catch((e) => {
                sendResponse(e);
              });
            } else {
              if (!item) {
                response['statusCode'] = 404;
                response['body'] = {
                  'error': 'No redirection registered for specified ID!'
                };
                return sendResponse(response);
              }
              if (!redirectURL) {
                response['statusCode'] = 400;
                response['body'] = {
                  'error': 'Redirection target URL not specified!'
                };
                return sendResponse(response);
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
                sendResponse(response);
              })
              .catch((e) => {
                sendResponse(e);
              });
            } else {
              if (!item) {
                response['statusCode'] = 404;
                response['body'] = {
                  'error': 'No redirection registered for specified ID!'
                };
                return sendResponse(response);
              }
            }
            break;
          default:
            sendResponse('Invalid HTTP method!');
            break;
        }
    };

    return db.getItem({
      Key: {
        'id': {
          S: redirectID
        }
      },
      TableName: redirectsTableName
    }, processRequest);
};
