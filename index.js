exports.handler = (event, context, callback) => {
    // TODO implement
    let response = {
        'isBase64Encoded': false,
        'statusCode': 418,
        'headers': {},
        'body': 'Hello World from a Little-Teapot!'
    }
    callback(null, response);
};
