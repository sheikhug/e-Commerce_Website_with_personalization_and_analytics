import {ResourceNotFoundException} from "@aws-sdk/client-personalize";

const {PersonalizeClient, DescribeCampaignCommand} = require("@aws-sdk/client-personalize");
const config = {
    region: process.env.REGION
}


export const handler = async (event, context) => {
    const client = new PersonalizeClient(config);
    const body = JSON.parse(event.body);

    const input = {
        campaignArn: body.campaignArn,

    };
    const command = new DescribeCampaignCommand(input);
    try {
        const response = await client.send(command);
        return  {
            statusCode: 200,
            body: JSON.stringify(response.campaign.status)
        }
    } catch (e) {
        if (e instanceof ResourceNotFoundException) {
            return {
                statusCode: 500,
                body: `Campaign is deleted or does not exist`
            }
        }
        return {
            statusCode: 500,
            body: JSON.stringify(e)
        }
    }

};

