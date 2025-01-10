const AWS = require('aws-sdk');
const https = require('https');

exports.handler = async (event) => {
    const endpoint = process.env.OPENSEARCH_ENDPOINT;
    
    for (const record of event.Records) {
        if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') continue;
        
        const order = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
        
        // Prepare the document for OpenSearch
        const document = {
            id: order.orderId,
            ...order
        };
        
        // Index the document in OpenSearch
        try {
            const request = new AWS.HttpRequest(new AWS.Endpoint(endpoint), process.env.AWS_REGION);
            
            request.method = 'POST';
            request.path = '/orders/_doc/' + document.id;
            request.body = JSON.stringify(document);
            request.headers['Content-Type'] = 'application/json';
            request.headers['Host'] = endpoint;

            const credentials = new AWS.EnvironmentCredentials('AWS');
            const signer = new AWS.Signers.V4(request, 'es');
            signer.addAuthorization(credentials, new Date());

            await new Promise((resolve, reject) => {
                const req = https.request({
                    ...request,
                    host: endpoint
                }, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => resolve(body));
                });

                req.on('error', reject);
                req.write(request.body);
                req.end();
            });
        } catch (error) {
            console.error('Error indexing to OpenSearch:', error);
            throw error;
        }
    }
    
    return { statusCode: 200, body: 'Processed successfully' };
};