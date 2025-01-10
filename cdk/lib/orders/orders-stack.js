const { Stack, RemovalPolicy, Duration } = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const lambda = require('aws-cdk-lib/aws-lambda');
const iam = require('aws-cdk-lib/aws-iam');
const stepfunctions = require('aws-cdk-lib/aws-stepfunctions');
const tasks = require('aws-cdk-lib/aws-stepfunctions-tasks');
const ses = require('aws-cdk-lib/aws-ses');
const s3 = require('aws-cdk-lib/aws-s3');
const cloudfront = require('aws-cdk-lib/aws-cloudfront');
const origins = require('aws-cdk-lib/aws-cloudfront-origins');
const cognito = require('aws-cdk-lib/aws-cognito');
const apigateway = require('aws-cdk-lib/aws-apigateway');
const kinesis = require('aws-cdk-lib/aws-kinesis');
const redshift = require('aws-cdk-lib/aws-redshift');
const opensearch = require('aws-cdk-lib/aws-opensearchservice');
const quicksight = require('aws-cdk-lib/aws-quicksight');
const ssm = require('aws-cdk-lib/aws-ssm');
// const sfn = require('aws-cdk-lib/aws-stepfunctions');


class OrdersStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // Create DynamoDB table with stream enabled
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create S3 bucket for static website
    const websiteBucket = new s3.Bucket(this, 'XXXXXXXXXXXXX', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(websiteBucket),
      },
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'OrdersUserPool', {
      selfSignUpEnabled: true,
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'OrdersUserPoolClient', {
      userPool,
      generateSecret: false,
    });

    // Create Order Submit Lambda
    const orderSubmitLambda = new lambda.Function(this, 'OrderSubmitLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lib/orders/lambda'),
      environment: {
        TABLE_NAME: ordersTable.tableName,
      },
    });

    // Grant Lambda permissions to write to DynamoDB
    ordersTable.grantWriteData(orderSubmitLambda);

    // Create Stream Processor Lambda
    const orderProcessorLambda = new lambda.Function(this, 'orderProcessorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'orderProcessor.handler',
      code: lambda.Code.fromAsset('lib/orders/lambda'),
      environment: {
        STATE_MACHINE_ARN: '',  // Will be set after state machine creation
      },
    });

    // Grant Lambda permissions to read from DynamoDB Stream
    ordersTable.grantStreamRead(orderProcessorLambda);

    // Create Step Functions states
    const processOrder = new stepfunctions.Pass(this, 'ProcessOrder');

    // const processOrder = new tasks.LambdaInvoke(this, 'ProcessOrderTask', {
    //     lambdaFunction: orderProcessorLambda,
    //   });

    const processPayment = new tasks.LambdaInvoke(this, 'ProcessPaymentTask', {
        lambdaFunction: orderProcessorLambda,
        comment: 'Process the order',
      });

    const shipOrder = new stepfunctions.Pass(this, 'ShipOrder');


    // const sendSuccessEmail = new tasks.CallAwsService(this, 'SendOrderSuccessEmail', {
    //   service: 'ses',
    //   action: 'sendEmail',
    //   iamResources: ['*'],  // You might want to restrict this
    //   parameters: {
    //     Source: 'your-verified-email@example.com',  // Replace with your verified email
    //     Destination: {
    //       ToAddresses: [stepfunctions.JsonPath.stringAt('$.customerEmail')]  // Get email from input
    //     },
    //     Message: {
    //       Subject: {
    //         Data: 'Order Processing Success'
    //       },
    //       Body: {
    //         Text: {
    //           Data: 'Your order processed successfully.'  // Get message from input
    //         }
    //       }
    //     }
    //   }
    // });

    // const sendFailureEmail = new tasks.CallAwsService(this, 'SendOrderFailureEmail', {
    //   service: 'ses',
    //   action: 'sendEmail',
    //   iamResources: ['*'],  // You might want to restrict this
    //   parameters: {
    //     Source: 'your-verified-email@example.com',  // Replace with your verified email
    //     Destination: {
    //       ToAddresses: [stepfunctions.JsonPath.stringAt('$.customerEmail')]  // Get email from input
    //     },
    //     Message: {
    //       Subject: {
    //         Data: 'Order Processing Failed'
    //       },
    //       Body: {
    //         Text: {
    //           Data: 'Your order processing failed.'  // Get message from input
    //         }
    //       }
    //     }
    //   }
    // });




    // const sendSuccessEmailTask = new tasks.CallAwsService(this, 'SendSuccessEmail', {
    //   service: 'ses',
    //   action: 'sendEmail',
    //   iamResources: ['*'],
    //   parameters: {
    //     Source: 'your-verified-email@example.com',
    //     Destination: {
    //       ToAddresses: [stepfunctions.JsonPath.stringAt('$.customerEmail')]
    //     },
    //     Message: {
    //       Subject: {
    //         Data: 'Order Successfully Processed'
    //       },
    //       Body: {
    //         Text: {
    //           Data: stepfunctions.JsonPath.format(
    //             'Your order #{} has been successfully processed.',
    //             stepfunctions.JsonPath.stringAt('$.orderId')
    //           )
    //         }
    //       }
    //     }
    //   }
    // });

    // const sendFailureEmailTask = new tasks.CallAwsService(this, 'SendFailureEmail', {
    //   service: 'ses',
    //   action: 'sendEmail',
    //   iamResources: ['*'],
    //   parameters: {
    //     Source: 'your-verified-email@example.com',
    //     Destination: {
    //       ToAddresses: [stepfunctions.JsonPath.stringAt('$.customerEmail')]
    //     },
    //     Message: {
    //       Subject: {
    //         Data: 'Order Processing Failed'
    //       },
    //       Body: {
    //         Text: {
    //           Data: stepfunctions.JsonPath.format(
    //             'We encountered an issue processing your order #{}.',
    //             stepfunctions.JsonPath.stringAt('$.orderId')
    //           )
    //         }
    //       }
    //     }
    //   }
    // });


    // const sendShipmentEmail = new tasks.CallAwsService(this, 'SendShipmentEmail', {
    //   service: 'ses',
    //   action: 'sendEmail',
    //   iamResources: ['*'],  // You might want to restrict this
    //   parameters: {
    //     Source: 'your-verified-email@example.com',  // Replace with your verified email
    //     Destination: {
    //       ToAddresses: [stepfunctions.JsonPath.stringAt('$.customerEmail')]  // Get email from input
    //     },
    //     Message: {
    //       Subject: {
    //         Data: 'Order Shipped.'
    //       },
    //       Body: {
    //         Text: {
    //           Data: 'Your order has been shipped.'  // Get message from input
    //         }
    //       }
    //     }
    //   }
    // });



    // // Create Success and Failure final states
    // const successState = new stepfunctions.Succeed(this, 'OrderProcessingSucceeded');
    // const failureState = new stepfunctions.Fail(this, 'OrderProcessingFailed', {
    //   cause: 'Order Processing Failed',
    //   error: 'OrderProcessingError'
    // });

    // // Chain the email tasks with final states
    // const successPath = sendSuccessEmailTask.next(successState);
    // const failurePath = sendFailureEmailTask.next(failureState);


 


    // // Create the Choice state
    // const paymentChoice = new stepfunctions.Choice(this, 'PaymentSuccessful?')
    //   .when(stepfunctions.Condition.stringEquals('$.paymentStatus', 'SUCCESS'), successPath)
    //   .otherwise(failurePath);

    // // // Define the main workflow
    // // const definition = stepfunctions.Chain
    // //   .start(paymentChoice);


    // const definition = processOrder
    //   .next(processPayment)
    //   .next(paymentChoice)
 

    // lib/orders/orders-stack.js
    
    const sendSuccessEmailTask = new tasks.CallAwsService(this, 'SendSuccessEmail', {
        service: 'ses',
        action: 'sendEmail',
        iamResources: ['*'],
        parameters: {
            Source: 'your-verified-email@example.com',
            Destination: {
                ToAddresses: {
                    'Fn::JsonToString': stepfunctions.JsonPath.stringAt('$.customerEmail')
                }
            },
            Message: {
                Subject: {
                    Data: 'Order Successfully Processed'
                },
                Body: {
                    Text: {
                        Data: stepfunctions.JsonPath.format(
                            'Your order #{} has been successfully processed.',
                            stepfunctions.JsonPath.stringAt('$.orderId')
                        )
                    }
                }
            }
        }
    });
    
    const sendFailureEmailTask = new tasks.CallAwsService(this, 'SendFailureEmail', {
        service: 'ses',
        action: 'sendEmail',
        iamResources: ['*'],
        parameters: {
            Source: 'your-verified-email@example.com',
            Destination: {
                ToAddresses: {
                    'Fn::JsonToString': stepfunctions.JsonPath.stringAt('$.customerEmail')
                }
            },
            Message: {
                Subject: {
                    Data: 'Order Processing Failed'
                },
                Body: {
                    Text: {
                        Data: stepfunctions.JsonPath.format(
                            'We encountered an issue processing your order #{}.',
                            stepfunctions.JsonPath.stringAt('$.orderId')
                        )
                    }
                }
            }
        }
    });
    
    const sendShipmentEmail = new tasks.CallAwsService(this, 'SendShipmentEmail', {
        service: 'ses',
        action: 'sendEmail',
        iamResources: ['*'],
        parameters: {
            Source: 'your-verified-email@example.com',
            Destination: {
                ToAddresses: {
                    'Fn::JsonToString': stepfunctions.JsonPath.stringAt('$.customerEmail')
                }
            },
            Message: {
                Subject: {
                    Data: 'Order Shipped'
                },
                Body: {
                    Text: {
                        Data: stepfunctions.JsonPath.format(
                            'Your order #{} has been shipped.',
                            stepfunctions.JsonPath.stringAt('$.orderId')
                        )
                    }
                }
            }
        }
    });
    
    // Create Success and Failure final states
    const successState = new stepfunctions.Succeed(this, 'OrderProcessingSucceeded');
    const failureState = new stepfunctions.Fail(this, 'OrderProcessingFailed', {
        cause: 'Payment Processing Failed',
        error: 'PaymentProcessingError'
    });
    

    const successPath = shipOrder
        .next(sendShipmentEmail)
        .next(successState);
    
    // Create the Choice state with proper paths
    const paymentChoice = new stepfunctions.Choice(this, 'PaymentSuccessful?')
        .when(stepfunctions.Condition.stringEquals('$.paymentStatus', 'SUCCESS'), successPath)
        .otherwise(failureState);
    
    // Define the main workflow
    const definition = processOrder
        .next(processPayment)
        .next(paymentChoice);
    


    // Create the state machine
    const stateMachine = new stepfunctions.StateMachine(this, 'OrderProcessingStateMachine', {
      definition,
      timeout: Duration.minutes(5)
    });

    // Add necessary IAM permissions
    stateMachine.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*']
    }));

    



    // Update Stream Processor Lambda with State Machine ARN
    orderProcessorLambda.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);
    
    // Grant Stream Processor Lambda permission to start Step Functions execution
    stateMachine.grantStartExecution(orderProcessorLambda);


    const streamArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/my-app/kinesis/stream-arn'
    );


    const kinesisStream = kinesis.Stream.fromStreamArn(this, 'ImportedStream',
      streamArn 
    );


    // Create Redshift cluster
    const redshiftCluster = new redshift.Cluster(this, 'AnalyticsCluster', {
      masterUser: {
        masterUsername: 'admin',
      },
      nodeType: redshift.NodeType.DC2_LARGE,
      clusterType: redshift.ClusterType.SINGLE_NODE,
      defaultDatabaseName: 'ordersdb',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Grant necessary permissions for QuickSight integration
    redshiftCluster.grantConnect('quicksight-role');

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'OrdersApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add Cognito Authorizer
    const auth = new apigateway.CognitoUserPoolsAuthorizer(this, 'OrdersAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // Create API Gateway resource and method
    const orders = api.root.addResource('orders');
    orders.addMethod('POST', new apigateway.LambdaIntegration(orderSubmitLambda), {
      authorizer: auth,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Grant permissions for QuickSight to access Redshift
    const quickSightPrincipal = new iam.ServicePrincipal('quicksight.amazonaws.com');
    redshiftCluster.grantConnect(quickSightPrincipal);




    // Create IAM role for Kinesis to Redshift streaming
    const firehoseRole = new iam.Role(this, 'KinesisFirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    firehoseRole.addToPolicy(new iam.PolicyStatement({
      actions: ['redshift:GetClusterCredentials'],
      resources: [redshiftCluster.clusterArn],
    }));

    // Grant the Kinesis stream permissions to write to Redshift
    kinesisStream.grantRead(firehoseRole);



    // Create QuickSight data source for Redshift
    new quicksight.CfnDataSource(this, 'OrdersRedshiftDataSource', {
      awsAccountId: props.env.account,
      dataSourceId: 'orders-redshift-source',
      name: 'Orders Redshift Source',
      type: 'REDSHIFT',
      dataSourceParameters: {
        redshiftParameters: {
          database: 'ordersdb',
          host: redshiftCluster.clusterEndpoint.hostname,
          port: redshiftCluster.clusterEndpoint.port,
        }
      },
      permissions: [{
        principal: quickSightPrincipal.policyFragment.principalJson,
        actions: [
          'quicksight:DescribeDataSource',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:UpdateDataSource',
          'quicksight:DeleteDataSource'
        ]
      }]
    });



    
    // Create OpenSearch domain
    const openSearchDomain = new opensearch.Domain(this, 'OrdersOpenSearch', {
      version: opensearch.EngineVersion.OPENSEARCH_2_5,
      capacity: {
        dataNodes: 1,
        dataNodeInstanceType: 't3.small.search',
      },
      ebs: {
        volumeSize: 10,
      },
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production
    });



    // Create IAM role for DynamoDB to OpenSearch streaming
    const streamRole = new iam.Role(this, 'DynamoDBStreamRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    streamRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'dynamodb:DescribeStream',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:ListStreams',
      ],
      resources: [ordersTable.tableStreamArn],
    }));

    streamRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'es:ESHttpPost',
        'es:ESHttpPut',
      ],
      resources: [`${openSearchDomain.domainArn}/*`],
    }));



    // Create Lambda function to process DynamoDB streams
    const streamProcessorLambda = new lambda.Function(this, 'StreamProcessorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'streamProcessor.handler',
      code: lambda.Code.fromAsset('lib/orders/lambda'),
      environment: {
        OPENSEARCH_ENDPOINT: openSearchDomain.domainEndpoint,
      },
      role: streamRole,
    });

    // Add Lambda stream processing
    ordersTable.grantStreamRead(streamProcessorLambda);

        
    // Grant QuickSight access to OpenSearch
    openSearchDomain.grantReadWrite(quickSightPrincipal);
    
    // Create QuickSight data source for OpenSearch (Note: Additional QuickSight setup required in console)
    new quicksight.CfnDataSource(this, 'OrdersQuickSightSource', {
      awsAccountId: props.env.account,
      dataSourceId: 'orders-opensearch-source',
      name: 'Orders OpenSearch Source',
      type: 'AMAZON_OPENSEARCH',
      dataSourceParameters: {
        amazonOpenSearchParameters: {
          domain: openSearchDomain.domainEndpoint
        }
      },
      permissions: [{
        principal: quickSightPrincipal.policyFragment.principalJson,
        actions: [
          'quicksight:DescribeDataSource',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:UpdateDataSource',
          'quicksight:DeleteDataSource'
        ]
      }]
    });







  }
}

module.exports = { OrdersStack };