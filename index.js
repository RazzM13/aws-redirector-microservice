exports.handler = (event, context, callback) => {
    let response = {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': {},
        'body': ''
    }

    if (event['httpMethod'] == 'GET') {
        response['statusCode'] = 301;
        response['headers']['Location'] = '/';
    }

    callback(null, response);
};
