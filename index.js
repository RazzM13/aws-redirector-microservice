exports.handler = (event, context, callback) => {
    let response = {
        'isBase64Encoded': false,
        'statusCode': 400,
        'headers': {},
        'body': ''
    }

    if (event['httpMethod'] == 'GET') {
        response['statusCode'] = 301;
        headers['Location'] = 'https://www.google.ro/'
    }

    callback(null, response);
};
