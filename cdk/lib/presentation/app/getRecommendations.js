import { PersonalizeRuntimeClient, GetRecommendationsCommand } from "@aws-sdk/client-personalize-runtime";

const config = {
    region: process.env.REGION
}

export const handler = async (event, context) => {
    console.log("EVENT: \n" + JSON.stringify(event.queryStringParameters, null, 2));

    const client = new PersonalizeRuntimeClient(config);
    const input = {
        campaignArn: event.queryStringParameters.campaignArn,
        userId: event.queryStringParameters.userId,
        numResults: Number(event.queryStringParameters.numResults)
    };

    const command = new GetRecommendationsCommand(input);

    try {
        const response = await client.send(command);
        return  {
            statusCode: 200,
            body: JSON.stringify(response)
        }    }catch (e) {
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }    }

}