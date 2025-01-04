import { DynamoDB } from 'aws-sdk';
import { Client } from '@opensearch-project/opensearch';

const dynamodb = new DynamoDB.DocumentClient();
const opensearch = new Client({
  node: process.env.OPENSEARCH_DOMAIN,
});

export const handler = async (event: any) => {
  try {
    const order = JSON.parse(event.body);
    
    // Store in DynamoDB
    await dynamodb.put({
      TableName: process.env.ORDERS_TABLE!,
      Item: {
        orderId: Date.now().toString(),
        ...order,
        createdAt: new Date().toISOString(),
      },
    }).promise();

    // Index in OpenSearch
    await opensearch.index({
      index: 'orders',
      body: order,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Order processed successfully' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error processing order' }),
    };
  }
};
