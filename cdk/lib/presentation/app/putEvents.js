import {PersonalizeEventsClient, PutEventsCommand} from
        "@aws-sdk/client-personalize-events";


const config = {
    region: process.env.REGION
}
const client = new PersonalizeEventsClient(config);

export const handler = async (event, context) => {
    console.log('Input Body', JSON.stringify(event, null, 2));
    let body;
    let result = []

        let record = event.Records.pop()
        console.log('Record', record)
        let payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
        body = JSON.parse(payload)
    const userId = body.userId
    const interactions = body.interactions
    console.log('interactions interactions:', interactions);

    try {
        let response;
            for (let i = 0; i < interactions; i++) {

                let itemId=  body.itemId
                let eventType = body.eventType;
                let sessionId = generateSessionId(12)
                let sentAt = body.sentAt
                const input = {
                    trackingId: body.trackingId,
                    userId: userId,
                    sessionId: sessionId,
                    eventList: [
                        {
                            eventType: eventType,
                            itemId: itemId,
                            sentAt: new Date(sentAt),
                            properties: {}
                        },
                    ],
                };

                const command = new PutEventsCommand(input);
                try {
                    response = await client.send(command);
                }catch (e) {
                    console.log(`Error while sending event command to Event Tracker ${e} `)
                    return {
                        statusCode: 500,
                        body: JSON.stringify(e)
                    }
                }

                let output = {
                    itemId : itemId,
                    eventType : eventType,
                    userId: userId,
                    response: response
                }

                result.push(output)
                console.log(`Event put successfully ${JSON.stringify(response)} `)

            }
    }catch (e) {
        console.log(`Error while configuring event to Event Tracker ${JSON.stringify(e)} `)

        return {
            statusCode: 500,
            body: JSON.stringify(e)
            }
        }

    return  {
        statusCode: 200,
        body: JSON.stringify(result)
    }

};

const generateSessionId = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }

    return result;
}
