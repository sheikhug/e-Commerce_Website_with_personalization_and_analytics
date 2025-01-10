import {InvalidInputException, ResourceInUseException, ResourceNotFoundException} from "@aws-sdk/client-personalize";

const {PersonalizeClient, DeleteEventTrackerCommand, DeleteCampaignCommand} = require("@aws-sdk/client-personalize");

const config = {
    region: process.env.REGION
}


export const handler = async (event, context) => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    let eventTrackerDeletionSuccess, campaignDeletionSuccess = true;
    const client = new PersonalizeClient(config);
    const body = JSON.parse(event.body);

    const inputDeleteCampaign = {
        campaignArn: body.campaignArn,

    };

    const inputDeleteEventTracker = {
        eventTrackerArn: body.eventTrackerArn,

    };
    const commandDeleteCampaign = new DeleteCampaignCommand(inputDeleteCampaign);
    const commandDeleteEventTracker = new DeleteEventTrackerCommand(inputDeleteEventTracker);

    //const responseCommandDeleteCampaign = await client.send(commandDeleteCampaign);
   // console.log("responseCommandDeleteCampaign", responseCommandDeleteCampaign)

    let responseCommandDeleteEventTracker, responseCommandDeleteCampaign;
    try {
        responseCommandDeleteEventTracker = await client.send(commandDeleteEventTracker);
        console.log("responseCommandDeleteEventTracker", responseCommandDeleteEventTracker)

    } catch (e) {
        eventTrackerDeletionSuccess = false
        if (e instanceof InvalidInputException){
            responseCommandDeleteEventTracker = e.message
            console.log("error1", e.message)
        }else if (e instanceof ResourceInUseException){
            responseCommandDeleteEventTracker = e.message
            console.log("error2", e.message)

        }else if (e instanceof ResourceNotFoundException){
            responseCommandDeleteEventTracker = e.message
            console.log("error3", e.message)

        }else{
            console.log("error4", e.message)
        }

    }
    
    
    try {
        responseCommandDeleteCampaign = await client.send(commandDeleteCampaign);
        console.log("responseCommandDeleteCampaign", responseCommandDeleteCampaign)
    }catch (e) {
        campaignDeletionSuccess = false
        if (e instanceof InvalidInputException){
            responseCommandDeleteCampaign = e.message
            console.log("errorC1", e.message)
        }else if (e instanceof ResourceInUseException){
            responseCommandDeleteCampaign = e.message
            console.log("errorC2", e.message)

        }else if (e instanceof ResourceNotFoundException){
            responseCommandDeleteCampaign = e.message
            console.log("errorC3", e.message)

        }else{
            console.log("errorC4", e.message)
        }
    }


    if (eventTrackerDeletionSuccess && campaignDeletionSuccess){
        console.log("Resources deleted")

        return  {
            statusCode: 200,
            body: {
                deleteCampaignResponse: JSON.stringify(responseCommandDeleteCampaign),
                deleteEventTracker: JSON.stringify(responseCommandDeleteEventTracker)
            }
        }
    }else{
        console.log(`Resources not deleted. ${responseCommandDeleteCampaign} - ${responseCommandDeleteEventTracker}`)

        return {
            statusCode: 500,
            body: `deleteCampaignResponse: ${JSON.stringify(responseCommandDeleteCampaign)}, deleteEventTracker: ${JSON.stringify(responseCommandDeleteEventTracker)}`

        }
    }



};

