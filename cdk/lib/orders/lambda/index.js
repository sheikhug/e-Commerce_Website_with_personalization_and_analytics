exports.handler = async function(event) {
  const AWS = require('aws-sdk');
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  
  try {
    const order = JSON.parse(event.body);
    
    if (!order.orderId) {
      throw new Error('orderId is required');
    }
    
    const params = {
      TableName: process.env.TABLE_NAME,
      Item: {
        orderId: order.orderId,
        ...order,
        createdAt: new Date().toISOString()
      }
    };
    
    await dynamodb.put(params).promise();
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Order created successfully" })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};