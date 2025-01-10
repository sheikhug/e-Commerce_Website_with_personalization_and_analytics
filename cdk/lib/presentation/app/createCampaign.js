
const {PersonalizeClient, CreateCampaignCommand} = require("@aws-sdk/client-personalize");
const config = {
    region: process.env.REGION
}
export const handler = async (event, context) => {
    const body = JSON.parse(event.body);

    const client = new PersonalizeClient(config);
    const input = {
        name: body.name,
        solutionVersionArn: body.solutionVersionArn,
        minProvisionedTPS: Number("1"),

    };
    const command = new CreateCampaignCommand(input);
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

