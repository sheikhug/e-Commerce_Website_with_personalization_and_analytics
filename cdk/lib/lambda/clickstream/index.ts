
// Create the Lambda function code
// This should be saved in lambda/clickstream/index.ts
// Here's the Lambda function code that should be in lambda/clickstream/index.ts:


import { KinesisStreamEvent, Context } from 'aws-lambda';
import { PersonalizeEvents, Kinesis, FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const personalizeEvents = new PersonalizeEvents({ region: process.env.REGION });
const firehoseClient = new FirehoseClient({ region: process.env.REGION });

export const handler = async (event: KinesisStreamEvent, context: Context) => {
  try {
    for (const record of event.Records) {
      // Decode and parse the data
      const clickstreamData = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString());

      // Process for Personalize
      if (clickstreamData.eventType) {
        await personalizeEvents.putEvents({
          trackingId: process.env.PERSONALIZE_TRACKING_ID,
          userId: clickstreamData.userId,
          sessionId: clickstreamData.sessionId,
          eventList: [{
            eventType: clickstreamData.eventType,
            sentAt: new Date(clickstreamData.timestamp),
            properties: JSON.stringify(clickstreamData.properties)
          }]
        });
      }

      // Forward to Firehose
      await firehoseClient.send(new PutRecordCommand({
        DeliveryStreamName: process.env.FIREHOSE_DELIVERY_STREAM,
        Record: {
          Data: Buffer.from(JSON.stringify(clickstreamData))
        }
      }));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed clickstream data',
        recordsProcessed: event.Records.length
      })
    };
  } catch (error) {
    console.error('Error processing clickstream data:', error);
    throw error;
  }
};
