// lib/orders/lambda/streamProcessor.js

const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const sfnClient = new SFNClient();

exports.handler = async (event) => {
    try {
        console.log('Received event:', JSON.stringify(event, null, 2));

        const records = event.Records || [];
        const stateMachineArn = process.env.STATE_MACHINE_ARN;

        if (!stateMachineArn) {
            throw new Error('STATE_MACHINE_ARN environment variable is not set');
        }

        for (const record of records) {
            // Only process new images from INSERT and MODIFY events
            if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
                const newImage = record.dynamodb.NewImage;

                // Convert DynamoDB JSON to regular JSON
                const orderData = unmarshallDynamoDBImage(newImage);

                // Start Step Functions execution
                const executionInput = {
                    orderId: orderData.orderId,
                    orderData: orderData,
                    timestamp: new Date().toISOString()
                };

                const startExecutionCommand = new StartExecutionCommand({
                    stateMachineArn: stateMachineArn,
                    input: JSON.stringify(executionInput),
                    name: `Order-${orderData.orderId}-${Date.now()}` // Unique execution name
                });

                const response = await sfnClient.send(startExecutionCommand);
                console.log('Started execution:', response.executionArn);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully processed records',
                processedRecords: records.length
            })
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

function unmarshallDynamoDBImage(dbImage) {
    const unmarshalledData = {};

    for (const [key, value] of Object.entries(dbImage)) {
        if (value.S) unmarshalledData[key] = value.S;
        else if (value.N) unmarshalledData[key] = Number(value.N);
        else if (value.BOOL !== undefined) unmarshalledData[key] = value.BOOL;
        else if (value.M) unmarshalledData[key] = unmarshallDynamoDBImage(value.M);
        else if (value.L) unmarshalledData[key] = value.L.map(item => unmarshallDynamoDBImage({ item }).item);
    }

    return unmarshalledData;
}
