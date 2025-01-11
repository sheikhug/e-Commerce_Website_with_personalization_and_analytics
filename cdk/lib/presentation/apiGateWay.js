// const {RestApi, LambdaIntegration, AwsIntegration, PassthroughBehavior, Model} = require("aws-cdk-lib/aws-apigateway");
// const {NodejsFunction} = require("aws-cdk-lib/aws-lambda-nodejs");
// const path = require("path");
// const {StartingPosition} = require("aws-cdk-lib/aws-lambda");
// const {Role, ServicePrincipal, Effect, PolicyStatement} = require("aws-cdk-lib/aws-iam");
// const {Stream} = require("aws-cdk-lib/aws-kinesis")
// const {Bucket} = require("aws-cdk-lib/aws-s3");
// // const {DeliveryStream} = require("@aws-cdk/aws-kinesisfirehose-alpha")
// const { S3Bucket} = require("@aws-cdk/aws-kinesisfirehose-destinations-alpha")
// const {KinesisEventSource} = require("@aws-cdk/aws-lambda-event-sources")
// const {CfnParameter} = require("aws-cdk-lib");
// const ssm = require('aws-cdk-lib/aws-ssm');
// import * as firehose from '@aws-cdk/aws-kinesisfirehose-alpha';
// // import * as s3 from 'aws-cdk-lib/aws-s3';
// import * as destinations from '@aws-cdk/aws-kinesisfirehose-destinations-alpha';

import { Stack, RemovalPolicy, Duration } from "aws-cdk-lib";
import { RestApi, LambdaIntegration, AwsIntegration, PassthroughBehavior, Model } from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import path from "path";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { Role, ServicePrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Stream } from "aws-cdk-lib/aws-kinesis";
import { Bucket } from "aws-cdk-lib/aws-s3";
// import { DeliveryStream } from "@aws-cdk/aws-kinesisfirehose-alpha";
import { S3Bucket } from "@aws-cdk/aws-kinesisfirehose-destinations-alpha";
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { CfnParameter } from "aws-cdk-lib";
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as firehose from '@aws-cdk/aws-kinesisfirehose-alpha';
import * as destinations from '@aws-cdk/aws-kinesisfirehose-destinations-alpha';
import { CfnOutput } from 'aws-cdk-lib';



import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const region = '024848486969';


const createPresentationLayer = (scope, entry, props) => {

    // const region = new CfnParameter(scope, 'solutionRegion', {
    //     type: 'String',
    //     description: 'Region where the solution is deployed',
    // });

    const api = new RestApi(scope, 'PersonalizeApiGateway', {
        restApiName: 'amazon-personalize-presentation-layer',
    });

    const createCampaign = new NodejsFunction(scope, 'personalizeLambda-createCampaign', {
        entry: path.resolve(__dirname, './app/createCampaign.js'),
        handler: 'handler',
        functionName: 'createCampaign',
        environment: {
            'REGION': region,
        }
    })

    createCampaign.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:CreateCampaign'],
            resources: ['*'],
        })
    )

    const createEventTracker = new NodejsFunction(scope, 'personalizeLambda-createEventTracker', {
        entry: path.resolve(__dirname, './app/createEventTracker.js'),
        handler: 'handler',
        functionName: 'createEventTracker',
        environment: {
            'REGION': region,
        }
    })

    createEventTracker.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:CreateEventTracker'],
            resources: ['*'],
        })
    )

    const createSolutionVersion = new NodejsFunction(scope, 'personalizeLambda-createSolutionVersion', {
        entry: path.resolve(__dirname, './app/createSolutionVersion.js'),
        handler: 'handler',
        functionName: 'createSolutionVersion',
        environment: {
            'REGION': region,
        }

    })
    createSolutionVersion.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:CreateSolutionVersion'],
            resources: ['*'],
        }))

    const putEvents = new NodejsFunction(scope, 'personalizeLambda-putEvents', {
        entry: path.resolve(__dirname, './app/putEvents.js'),
        handler: 'handler',
        functionName: 'putEvents',
        environment: {
            'REGION': region,
        }


    })
    putEvents.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:PutEvents'],
            resources: ['*'],
    }))

    const getRecommendations = new NodejsFunction(scope, 'personalizeLambda-getRecommendations', {
        entry: path.resolve(__dirname, './app/getRecommendations.js'),
        handler: 'handler',
        functionName: 'getRecommendations',
        environment: {
            'REGION': region,
        }

    })
    getRecommendations.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:GetRecommendations'],
            resources: ['*'],
        }))

    const deleteResources = new NodejsFunction(scope, 'deleteResources', {
        entry: path.resolve(__dirname, './app/deleteResources.js'),
        handler: 'handler',
        functionName: 'deleteResources',
        environment: {
            'REGION': region,
        }
    })

    deleteResources.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:DeleteEventTracker', 'personalize:DeleteCampaign'],
            resources: ['*'],
        }))

    const describeSolutionVersion = new NodejsFunction(scope, 'describeSolutionVersion', {
        entry: path.resolve(__dirname, './app/describeSolutionVersion.js'),
        handler: 'handler',
        functionName: 'describeSolutionVersion',
        environment: {
            'REGION': region,
        }
    })

    describeSolutionVersion.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:DescribeSolutionVersion'],
            resources: ['*'],
        }))

    const describeCampaign = new NodejsFunction(scope, 'describeCampaign', {
        entry: path.resolve(__dirname, './app/describeCampaign.js'),
        handler: 'handler',
        functionName: 'describeCampaign',
        environment: {
            'REGION': region,
        }
    })

    describeCampaign.role.addToPrincipalPolicy(
        new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['personalize:DescribeCampaign'],
            resources: ['*'],
        }))
    const createCampaignIntegration = new LambdaIntegration(createCampaign, {
        allowTestInvoke: false
    });
    const createEventTrackerIntegration = new LambdaIntegration(createEventTracker, {
        allowTestInvoke: false,
    });
    const createSolutionVersionIntegration = new LambdaIntegration(createSolutionVersion, {
        allowTestInvoke: false
    });
    const putEventsIntegration = new LambdaIntegration(putEvents, {
        allowTestInvoke: false
    });

    const getRecommendationsIntegration = new LambdaIntegration(getRecommendations, {
        allowTestInvoke: false
    });

    const deleteResourcesIntegration = new LambdaIntegration(deleteResources, {
        allowTestInvoke: false
    });

    const describeSolutionVersionIntegration = new LambdaIntegration(describeSolutionVersion, {
        allowTestInvoke: false
    });

    const describeCampaignIntegration = new LambdaIntegration(describeCampaign, {
        allowTestInvoke: false
    });

    const resourceCampaign = api.root.addResource('campaign');
    resourceCampaign.addMethod('POST', createCampaignIntegration);

    const resourceEventTracker = api.root.addResource('eventTracker');
    resourceEventTracker.addMethod('POST', createEventTrackerIntegration);

    const resourceSolutionVersion = api.root.addResource('solutionVersion');
    resourceSolutionVersion.addMethod('POST', createSolutionVersionIntegration);

    const resourcePutEvents = api.root.addResource('putEvents');
    resourcePutEvents.addMethod('POST', putEventsIntegration);

    const resourceGetRecommendations = api.root.addResource('getRecommendations');
    resourceGetRecommendations.addMethod('GET', getRecommendationsIntegration);

    const resourceDeleteResources = api.root.addResource('deleteResources');
    resourceDeleteResources.addMethod('DELETE', deleteResourcesIntegration);

    const describeSolutionVersionResources = api.root.addResource('describeSolutionVersion');
    describeSolutionVersionResources.addMethod('POST', describeSolutionVersionIntegration);

    const describeCampaignResources = api.root.addResource('describeCampaign');
    describeCampaignResources.addMethod('POST', describeCampaignIntegration);

    const kinesisDataStream = new Stream(scope, 'MyFirstStream', {
        streamName: 'my-stream',
    });
    const apiRole = new Role(scope, 'my-api-gw-role',{
        assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
        roleName: 'my-apigateway-role'
    })


    apiRole.addToPolicy(new PolicyStatement({
        actions: [     "kinesis:PutRecord"],
        resources: [
            kinesisDataStream.streamArn
        ],
        effect: Effect.ALLOW
    }))
    const putRecordMethodOptions = {
        requestParameters: {
            ['method.request.header.Content-Type']: true,
        },
    };
    const kinesisDataStreamIntegration = new AwsIntegration({
        allowTestInvoke: false,
        service: 'kinesis',
        action: 'PutRecord',
        integrationHttpMethod: "POST",
        options: {
            requestTemplates: {
                'application/json': "{\"StreamName\": \"$input.path(\'$.stream-name\')\",\"Data\": \"$util.base64Encode($input.json(\'$.Data\'))\",\n\"PartitionKey\": \"$input.path(\'$.PartitionKey\')\"}"
            },
            credentialsRole:apiRole,
            passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES,
            integrationResponses: [
                {
                    statusCode: "200",
                    responseTemplates: {
                        'application/json': "{\"Message\": \"Event sent successfully\", \"data\": $input.body}"
                    }
                }
            ]
        }
    });
    const methodOps = {
        methodResponses: [
            {
                statusCode: '200',
                responseModels: {
                    "application/json": Model.EMPTY_MODEL
                },
            }
        ]
    }
    const resourceKinesisData = api.root.addResource('data');
    resourceKinesisData.addMethod('POST', kinesisDataStreamIntegration, methodOps);

    const bucket = new Bucket(scope, 'MyBucketForKinesis');

    // const deliveryStream = new DeliveryStream(scope, 'MyDeliveryStream', {
    //     destinations: [new   S3Bucket(bucket)],
    //     sourceStream: kinesisDataStream
    // });

    const deliveryStream = new firehose.DeliveryStream(scope, 'MyDeliveryStream', {
        destination: new destinations.S3Bucket(bucket)
    });

    const eventSource = new KinesisEventSource( kinesisDataStream, {
        startingPosition: StartingPosition.TRIM_HORIZON,

    } );
    putEvents.addEventSource(eventSource)




    // Store the stream ARN in Parameter Store
    const parameter = new ssm.StringParameter(scope, 'KinesisStreamArnParameter', {
        parameterName: '/my-app/kinesis/stream-arn',
        stringValue: kinesisDataStream.streamArn,
        description: 'ARN of Kinesis Stream',
        tier: ssm.ParameterTier.STANDARD,
        // type: ssm.ParameterType.STRING,
    });


    
    
    new CfnOutput(scope, 'StreamArnParameterName', {
        value: parameter.parameterName,
        description: 'Parameter Store name for Kinesis Stream ARN',
    });

    // scope.kinesisStream = kinesisDataStream;

}

export {createPresentationLayer}