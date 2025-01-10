const {PersonalizeClient, DescribeSolutionVersionCommand} = require("@aws-sdk/client-personalize");
const config = {
    region: process.env.REGION
}


export const handler = async (event, context) => {
    const client = new PersonalizeClient(config);
    const body = JSON.parse(event.body);

    const input = {
        solutionVersionArn: body.solutionVersionArn,

    };
    const command = new DescribeSolutionVersionCommand(input);
    try {
        const response = await client.send(command);
        return  {
            statusCode: 200,
            body: JSON.stringify(response.solutionVersion.status)
        }
    } catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }
    }

};

