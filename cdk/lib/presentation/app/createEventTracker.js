const {PersonalizeClient, CreateEventTrackerCommand} = require("@aws-sdk/client-personalize");
const config = {
    region: process.env.REGION
}


export const handler = async (event, context) => {
    const client = new PersonalizeClient(config);
    const body = JSON.parse(event.body);

    const input = {
        name: body.name,
        datasetGroupArn: body.datasetGroupArn

    };
    const command = new CreateEventTrackerCommand(input);
    try {
        const response = await client.send(command);
        return  {
            statusCode: 200,
            body: JSON.stringify(response)
        }
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }
    }

};

