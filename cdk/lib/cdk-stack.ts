// lib/ecommerce-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as quicksight from 'aws-cdk-lib/aws-quicksight';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as es from 'aws-cdk-lib/aws-elasticsearch';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose';
import * as personalize from 'aws-cdk-lib/aws-personalize';
import * as redshift from 'aws-cdk-lib/aws-redshift';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';


export class EcommerceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ... (previous code remains the same)
    // S3 bucket for static content
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
    });

    

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        // origin: new origins.S3Origin(websiteBucket),
        origin: new origins.S3StaticWebsiteOrigin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      standardAttributes: {
        givenName:  { required: true, mutable: true },
        email:      { required: true, mutable: true },
      },
    });


    // DynamoDB Tables
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    
    



    // API Gateway
    const api = new apigateway.RestApi(this, 'EcommerceApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
      },
    });


    // Kinesis Data Stream for clickstream
    const clickstreamStream = new kinesis.Stream(this, 'ClickstreamStream', {
      streamMode: kinesis.StreamMode.ON_DEMAND,
    });

    
    // Create IAM role for Kinesis Firehose to read from Kinesis Data Stream
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      description: 'Role for Kinesis Firehose to read from Kinesis Data Stream',
    });
    
    // Add policy to allow Firehose to read from Kinesis Data Stream
    firehoseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kinesis:DescribeStream',
        'kinesis:GetShardIterator',
        'kinesis:GetRecords',
        'kinesis:ListShards'
      ],
      resources: [clickstreamStream.streamArn],
    }));
    
    // Add policy for Firehose to write to CloudWatch Logs
    firehoseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:PutLogEvents',
        'logs:CreateLogGroup',
        'logs:CreateLogStream'
      ],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kinesisfirehose/*`],
    }));
    
    // Add policy for Firehose to write to S3
    firehoseRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:AbortMultipartUpload',
        's3:GetBucketLocation',
        's3:GetObject',
        's3:ListBucket',
        's3:ListBucketMultipartUploads',
        's3:PutObject'
      ],
      resources: [
        websiteBucket.bucketArn,
        `${websiteBucket.bucketArn}/*`
      ],
    }));
    
    // Create S3 bucket for Firehose delivery
    const clickstreamBucket = new s3.Bucket(this, 'clickstreamBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
    
    // Update the Kinesis Firehose configuration with the role
    const clickstreamFirehose = new firehose.CfnDeliveryStream(this, 'ClickstreamFirehose', {
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: clickstreamStream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      s3DestinationConfiguration: {
        bucketArn: clickstreamBucket.bucketArn,
        roleArn: firehoseRole.roleArn,
        bufferingHints: {
          intervalInSeconds: 60,
          sizeInMBs: 1,
        },
        prefix: 'clickstream/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/',
        errorOutputPrefix: 'errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/',
        compressionFormat: 'GZIP',
      },
    });


    const encryptionConfig: firehose.CfnDeliveryStream.EncryptionConfigurationProperty = {
      kmsEncryptionConfig: {
        awskmsKeyArn: 'AUTO' // Uses AWS-managed KMS key
      },
    };

    
    // Optional: Add CloudWatch logging for Firehose
    const cloudWatchLoggingOptions = {
      enabled: true,
      logGroupName: '/aws/kinesisfirehose/clickstream',
      logStreamName: 'S3Delivery'
    };
    
    // // Add tags
    // cdk.Tags.of(clickstreamFirehose).add('Environment', 'Production');
    // cdk.Tags.of(clickstreamFirehose).add('Service', 'Clickstream');

    
    // Optional: Add metrics and monitoring
    const metric = new cloudwatch.Metric({
      namespace: 'AWS/Firehose',
      metricName: 'IncomingRecords',
      dimensionsMap: {
        DeliveryStreamName: clickstreamFirehose.ref
      },
      period: cdk.Duration.minutes(1)
    });
    
    // Create alarm for monitoring
    new cloudwatch.Alarm(this, 'ClickstreamFirehoseAlarm', {
      metric: metric,
      threshold: 1000,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    


    

    // Step Functions for order processing
    const orderProcessingStateMachine = new stepfunctions.StateMachine(this, 'OrderProcessingStateMachine', {
      definition: stepfunctions.Chain.start(new stepfunctions.Pass(this, 'StartState')),
    });




    // const clickstreamProcessor = new lambda.Function(this, 'ClickstreamProcessor', {
    //   runtime: lambda.Runtime.NODEJS_18_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset('lambda/clickstream'),
    //   environment: {
    //     KINESIS_STREAM: clickstreamStream.streamName,
    //   },
    // });

    // clickstreamStream.grantRead(clickstreamProcessor);





    // Create IAM role for the Lambda function
    const clickstreamProcessorRole = new iam.Role(this, 'ClickstreamProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Clickstream Processor Lambda',
    });

    // Add necessary permissions to the role
    clickstreamProcessorRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    // Add permissions for Kinesis, Personalize, and CloudWatch
    clickstreamProcessorRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'kinesis:GetRecords',
        'kinesis:GetShardIterator',
        'kinesis:DescribeStream',
        'kinesis:ListShards',
        'personalize:PutEvents',
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: [
        clickstreamStream.streamArn,
        `arn:aws:personalize:${this.region}:${this.account}:event-tracker/*`
      ]
    }));


    // Create the Lambda function
    const clickstreamProcessor = new lambda.Function(this, 'ClickstreamProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/clickstream'),
      role: clickstreamProcessorRole,
      environment: {
        KINESIS_STREAM: clickstreamStream.streamName,
        // PERSONALIZE_TRACKING_ID: 'your-tracking-id', // Replace with your Personalize tracking ID
        FIREHOSE_DELIVERY_STREAM: clickstreamFirehose.ref,
        REGION: this.region
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      // tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
    });


    // Create Event Source Mapping
    new lambda.EventSourceMapping(this, 'ClickstreamEventMapping', {
      target: clickstreamProcessor,
      eventSourceArn: clickstreamStream.streamArn,
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 100,
      maxBatchingWindow: cdk.Duration.seconds(30),
      retryAttempts: 3,
    });


    // Add CloudWatch Alarms
    new cloudwatch.Alarm(this, 'ClickstreamProcessorErrors', {
      metric: clickstreamProcessor.metricErrors(),
      threshold: 2,
      evaluationPeriods: 2,
      alarmDescription: 'Clickstream processor is experiencing errors',
    });


    new cloudwatch.Alarm(this, 'ClickstreamProcessorThrottles', {
      metric: clickstreamProcessor.metricThrottles(),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Clickstream processor is being throttled',
    });





    // IAM Roles
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });










    // OpenSearch Domain
    const openSearchDomain = new opensearch.Domain(this, 'EcommerceSearch', {
      version: opensearch.EngineVersion.OPENSEARCH_2_5,
      capacity: {
        dataNodes: 2,
        dataNodeInstanceType: 't3.small.search',
      },
      ebs: {
        volumeSize: 20,
      },
      zoneAwareness: {
        enabled: true,
      },
    });



// Add this to your CDK stack

// Create IAM role for the Lambda function
const ddbOpenSearchBridgeRole = new iam.Role(this, 'ddbOpenSearchBridgeRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  description: 'Role for Lambda bridge between DDB-Stream and ElasticSearch',
});

// Add necessary permissions to the role
ddbOpenSearchBridgeRole.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
);

// Add permissions for OpenSearch
ddbOpenSearchBridgeRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'es:ESHttpPost',
    'es:ESHttpPut',
    'es:ESHttpGet',
  ],
  resources: [
    openSearchDomain.domainArn,
    `${openSearchDomain.domainArn}/*`
  ]
}));

// Add permissions for DynamoDB Streams
ddbOpenSearchBridgeRole.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'dynamodb:DescribeStream',
    'dynamodb:GetRecords',
    'dynamodb:GetShardIterator',
    'dynamodb:ListStreams'
  ],
  resources: [
    ordersTable.tableStreamArn || ''
  ]
}));

// Create the Lambda function with inline Python code
const ddbOpenSearchBridge = new lambda.Function(this, 'DDBOpenSearchBridge', {
  runtime: lambda.Runtime.PYTHON_3_9,
  handler: 'index.handler',
  role: ddbOpenSearchBridgeRole,
  code: lambda.Code.fromInline(`
import os
import boto3
import requests
from requests_aws4auth import AWS4Auth
from opensearchpy import OpenSearch, RequestsHttpConnection

def get_opensearch_client():
    region = os.environ['AWS_REGION']
    service = 'es'
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        service,
        session_token=credentials.token
    )

    opensearch_client = OpenSearch(
        hosts=[{'host': os.environ['OPENSEARCH_DOMAIN'], 'port': 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection,
        timeout=300
    )
    return opensearch_client

    
def handler(event, context):
    try:
        client = get_opensearch_client()
        
        for record in event['Records']:
            # Skip non-INSERT/MODIFY events
            if record['eventName'] not in ['INSERT', 'MODIFY']:
                continue

            # Get the new image of the item
            new_image = record['dynamodb']['NewImage']
            
            # Convert DynamoDB JSON to regular JSON
            document = {k: list(v.values())[0] for k, v in new_image.items()}
            
            # Use the DynamoDB record ID as the OpenSearch document ID
            document_id = document.get('orderId', str(context.aws_request_id))
            
            # Index the document
            response = client.index(
                index='orders',
                body=document,
                id=document_id,
                refresh=True
            )
            
            print(f"Indexed document {document_id}: {response}")
            
        return {
            'statusCode': 200,
            'body': f'Successfully processed {len(event["Records"])} records'
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e
`),
  environment: {
    OPENSEARCH_DOMAIN: openSearchDomain.domainEndpoint,
  },
  timeout: cdk.Duration.minutes(5),
  memorySize: 256,
});

// Create Event Source Mapping for DynamoDB Stream
new lambda.EventSourceMapping(this, 'DDBOpenSearchBridgeMapping', {
  target: ddbOpenSearchBridge,
  eventSourceArn: ordersTable.tableStreamArn,
  startingPosition: lambda.StartingPosition.LATEST,
  batchSize: 100,
  maxBatchingWindow: cdk.Duration.seconds(30),
  retryAttempts: 3,
});

// Add CloudWatch Alarms
new cloudwatch.Alarm(this, 'DDBOpenSearchBridgeErrors', {
  metric: ddbOpenSearchBridge.metricErrors(),
  threshold: 2,
  evaluationPeriods: 2,
  alarmDescription: 'DynamoDB to OpenSearch bridge is experiencing errors',
});

new cloudwatch.Alarm(this, 'DDBOpenSearchBridgeThrottles', {
  metric: ddbOpenSearchBridge.metricThrottles(),
  threshold: 1,
  evaluationPeriods: 2,
  alarmDescription: 'DynamoDB to OpenSearch bridge is being throttled',
});



    




























    // Order Processing Lambda Functions
    const orderProcessingLambda = new lambda.Function(this, 'OrderProcessingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/orderProcessing'),
      role: lambdaRole,
      environment: {
        ORDERS_TABLE: ordersTable.tableName,
        OPENSEARCH_DOMAIN: openSearchDomain.domainEndpoint,
      },
    });

    const paymentProcessingLambda = new lambda.Function(this, 'PaymentProcessingLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/paymentProcessing'),
      role: lambdaRole,
    });

    const notificationLambda = new lambda.Function(this, 'NotificationLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/notification'),
      role: lambdaRole,
    });




    // Personalize Dataset Group and Solution
    const personalizeDatasetGroup = new personalize.CfnDatasetGroup(this, 'EcommerceDatasetGroup', {
      name: 'EcommerceRecommendations',
    });

    const interactionsSchema = new personalize.CfnSchema(this, 'InteractionsSchema', {
      name: 'EcommerceInteractions',
      schema: JSON.stringify({
        type: 'record',
        fields: [
          { name: 'USER_ID', type: 'string' },
          { name: 'ITEM_ID', type: 'string' },
          { name: 'TIMESTAMP', type: 'long' },
        ],
      }),
    });









    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true
    });

    // First, let's create necessary VPC security groups and IAM roles
    const redshiftSecurityGroup = new ec2.SecurityGroup(this, 'RedshiftSecurityGroup', {
      vpc: vpc, 
      description: 'Security group for Redshift cluster',
      allowAllOutbound: true,
    });

    const redshiftRole = new iam.Role(this, 'RedshiftRole', {
      assumedBy: new iam.ServicePrincipal('redshift.amazonaws.com'),
      description: 'IAM role for Redshift cluster',
    });

    // Grant necessary permissions to the Redshift role
    redshiftRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSRedshiftAllCommandsFullAccess')
    );

    // Create an S3 bucket for Redshift logging
    const redshiftLogsBucket = new s3.Bucket(this, 'RedshiftLogsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create the Redshift cluster
    const redshiftCluster = new redshift.CfnCluster(this, 'AnalyticsCluster', {
      clusterType: 'multi-node', // or 'single-node'
      dbName: 'analyticsdatabase',
      masterUsername: 'admin',
      nodeType: 'ra3.xlplus',
      
      // Optional properties with meaningful values
      // allowVersionUpgrade: true,
      // aquaConfigurationStatus: 'auto', // Enable AQUA (Advanced Query Accelerator)
      // automatedSnapshotRetentionPeriod: 7, // Retain automated snapshots for 7 days
      // availabilityZone: vpc.privateSubnets[0].availabilityZone,
      // availabilityZoneRelocation: true,
      // clusterIdentifier: 'ecommerce-analytics-cluster',
      // clusterParameterGroupName: 'default.redshift-1.0',
      // clusterVersion: '1.0',
      // encrypted: true, // Enable encryption at rest
      // enhancedVpcRouting: true, // Enable enhanced VPC routing
      
      // IAM roles
      iamRoles: [redshiftRole.roleArn],
      
      // kmsKeyId: encryptionKey.keyArn, // Assuming you have a KMS key defined
      
      // Logging configuration
      loggingProperties: {
        bucketName: redshiftLogsBucket.bucketName,
        s3KeyPrefix: 'redshift-logs/',
        logExports: ['connectionlog', 'userlog', 'useractivitylog'],
      },
      
      // Maintenance and backup settings
      // maintenanceTrackName: 'current',
      // manualSnapshotRetentionPeriod: 14, // Retain manual snapshots for 14 days
      // preferredMaintenanceWindow: 'sun:03:00-sun:04:00', // Maintenance window during low-usage period
      
      // Cluster size configuration
      numberOfNodes: 2, // ra3.xlplus requires minimum 2 nodes
      port: 5439, // Default Redshift port
      
      // Security configuration
      publiclyAccessible: false,
      
      // // Tags
      // tags: [
      //   {
      //     key: 'Environment',
      //     value: 'Production',
      //   },
      //   {
      //     key: 'Project',
      //     value: 'EcommerceAnalytics',
      //   },
      // ],
      
      // VPC security groups
      vpcSecurityGroupIds: [redshiftSecurityGroup.securityGroupId],
    });

    // Add ingress rules to security group
    redshiftSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(5439),
      'Allow access from within VPC'
    );

    // Create CloudWatch alarms for monitoring
    new cloudwatch.Alarm(this, 'RedshiftCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Redshift',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          ClusterIdentifier: redshiftCluster.ref,
        },
      }),
      threshold: 80,
      evaluationPeriods: 3,
      alarmDescription: 'Alert when CPU exceeds 80% for 3 consecutive periods',
    });





    // Step Functions Definition
    const orderWorkflow = new sfn.StateMachine(this, 'OrderProcessingWorkflow', {
      definition: sfn.Chain
        .start(new tasks.LambdaInvoke(this, 'ProcessOrder', {
          lambdaFunction: orderProcessingLambda,
        }))
        .next(new tasks.LambdaInvoke(this, 'ProcessPayment', {
          lambdaFunction: paymentProcessingLambda,
        }))
        .next(new sfn.Choice(this, 'PaymentSuccessful?')
          .when(sfn.Condition.stringEquals('$.paymentStatus', 'SUCCESS'),
            new tasks.LambdaInvoke(this, 'SendSuccessNotification', {
              lambdaFunction: notificationLambda,
            }))
          .otherwise(
            new tasks.LambdaInvoke(this, 'SendFailureNotification', {
              lambdaFunction: notificationLambda,
            })
          )),
    });



    // DynamoDB Stream to OpenSearch
    const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/streamProcessor'),
      environment: {
        OPENSEARCH_DOMAIN: openSearchDomain.domainEndpoint,
      },
    });

    ordersTable.grantStreamRead(streamProcessor);


    // API Gateway Endpoints
    const ordersResource = api.root.addResource('orders');
    const productsResource = api.root.addResource('products');
    const recommendationsResource = api.root.addResource('recommendations');

    ordersResource.addMethod('POST', new apigateway.LambdaIntegration(orderProcessingLambda));
    recommendationsResource.addMethod('GET', new apigateway.LambdaIntegration(
      new lambda.Function(this, 'RecommendationsLambda', {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset('lambda/recommendations'),
      })
    ));





    // // QuickSight Dashboard (Note: This requires additional setup in the QuickSight console)
    // const quicksightPrincipal = new iam.ServicePrincipal('quicksight.amazonaws.com');
   
    // const quicksightRole = new iam.Role(this, 'QuickSightRole', {
    //   assumedBy: quicksightPrincipal,
    // });

    // // redshiftCluster.grantRead(quicksightRole);
    // // Add policy to QuickSight role to access Redshift
    // quicksightRole.addToPolicy(new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: [
    //     'redshift:GetClusterCredentials',
    //     'redshift:DescribeClusters',
    //     'redshift:CreateClusterUser',
    //     'redshift:JoinGroup',
    //     'redshift:Connect'
    //   ],
    //   resources: [
    //     `arn:aws:redshift:${this.region}:${this.account}:cluster:${redshiftCluster.ref}`,
    //     `arn:aws:redshift:${this.region}:${this.account}:dbuser:${redshiftCluster.ref}/${redshiftCluster.masterUsername}`,
    //     `arn:aws:redshift:${this.region}:${this.account}:dbname:${redshiftCluster.ref}/${redshiftCluster.dbName}`,
    //     `arn:aws:redshift:${this.region}:${this.account}:dbgroup:${redshiftCluster.ref}/*`
    //   ]
    // }));
    
    // // Optional: Add policy for Redshift Data API access
    // quicksightRole.addToPolicy(new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: [
    //     'redshift-data:ExecuteStatement',
    //     'redshift-data:DescribeStatement',
    //     'redshift-data:GetStatementResult',
    //     'redshift-data:ListDatabases',
    //     'redshift-data:ListSchemas',
    //     'redshift-data:ListTables'
    //   ],
    //   resources: ['*']
    // }));
    
    // // Add policy for Redshift Serverless access (if needed)
    // quicksightRole.addToPolicy(new iam.PolicyStatement({
    //   effect: iam.Effect.ALLOW,
    //   actions: [
    //     'redshift-serverless:GetCredentials',
    //     'redshift-serverless:ListWorkgroups',
    //     'redshift-serverless:GetWorkgroup'
    //   ],
    //   resources: ['*']
    // }));
    



    const quicksightPrincipal = new iam.ServicePrincipal('quicksight.amazonaws.com');
       
    const quicksightRole = new iam.Role(this, 'QuickSightRole', {
      assumedBy: quicksightPrincipal,
    });
    
    // Add OpenSearch permissions
    quicksightRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'es:ESHttpGet',
        'es:DescribeElasticsearchDomain',
        'es:ESHttpPost',
        'es:ESHttpHead',
        'es:DescribeElasticsearchDomains',
        'es:ListDomainNames',
        'es:DescribeElasticsearchInstanceTypeLimits'
      ],
      resources: [
        `arn:aws:es:${this.region}:${this.account}:domain/${openSearchDomain.domainName}/*`,
        `arn:aws:es:${this.region}:${this.account}:domain/${openSearchDomain.domainName}`
      ]
    }));
    
    // Redshift permissions
    quicksightRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'redshift:GetClusterCredentials',
        'redshift:DescribeClusters',
        'redshift:CreateClusterUser',
        'redshift:JoinGroup',
        'redshift:Connect'
      ],
      resources: [
        `arn:aws:redshift:${this.region}:${this.account}:cluster:${redshiftCluster.ref}`,
        `arn:aws:redshift:${this.region}:${this.account}:dbuser:${redshiftCluster.ref}/${redshiftCluster.masterUsername}`,
        `arn:aws:redshift:${this.region}:${this.account}:dbname:${redshiftCluster.ref}/${redshiftCluster.dbName}`,
        `arn:aws:redshift:${this.region}:${this.account}:dbgroup:${redshiftCluster.ref}/*`
      ]
    }));
    
    // Redshift Data API permissions
    quicksightRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'redshift-data:ExecuteStatement',
        'redshift-data:DescribeStatement',
        'redshift-data:GetStatementResult',
        'redshift-data:ListDatabases',
        'redshift-data:ListSchemas',
        'redshift-data:ListTables'
      ],
      resources: ['*']
    }));
    
    // Add managed policy for OpenSearch
    quicksightRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSQuickSightOpenSearchPolicy')
    );
    
    // Create QuickSight-Redshift connection
    const redshiftQuicksightConnection = new quicksight.CfnDataSource(this, 'RedshiftQuicksightConnection', {
      awsAccountId: this.account,
      dataSourceId: 'redshift-connection',
      name: 'RedshiftConnection',
      type: 'REDSHIFT',
      dataSourceParameters: {
        redshiftParameters: {
          clusterId: redshiftCluster.attrId,
          database: redshiftCluster.dbName,
          host: redshiftCluster.attrEndpointAddress,
          port: + redshiftCluster.attrEndpointPort
        }
      },
      credentials: {
        credentialPair: {
          username: redshiftCluster.masterUsername,
          password: cdk.SecretValue.secretsManager('redshift-credentials').toString()
        }
      },
      permissions: [{
        principal: `arn:aws:quicksight:${this.region}:${this.account}:user/default/admin`, // Replace 'admin' with your QuickSight username
        actions: [
          'quicksight:UpdateDataSourcePermissions',
          'quicksight:DescribeDataSource',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:UpdateDataSource',
          'quicksight:DeleteDataSource'
        ]
      }]
    });
    




    // Create QuickSight-OpenSearch connection
    const openSearchQuicksightConnection = new quicksight.CfnDataSource(this, 'OpenSearchQuicksightConnection', {
      awsAccountId: this.account,
      dataSourceId: 'opensearch-connection',
      name: 'OpenSearchConnection',
      type: 'OPENSEARCH',
      dataSourceParameters: {
        amazonOpenSearchParameters: {
          domain: openSearchDomain.domainEndpoint
        }
      },
      sslProperties: {
        disableSsl: false
      },
      permissions: [{
        principal: `arn:aws:quicksight:${this.region}:${this.account}:user/default/admin`, // Replace 'admin' with your QuickSight username
        actions: [
          'quicksight:UpdateDataSourcePermissions',
          'quicksight:DescribeDataSource',
          'quicksight:DescribeDataSourcePermissions',
          'quicksight:PassDataSource',
          'quicksight:UpdateDataSource',
          'quicksight:DeleteDataSource'
        ]
      }]
    });
    








    
    
    // Grant necessary permissions
    openSearchDomain.grantRead(orderProcessingLambda);
    ordersTable.grantReadWriteData(orderProcessingLambda);
    clickstreamStream.grantReadWrite(orderProcessingLambda);




    // Output important values
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });
    new cdk.CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
    });

    // Output the cluster endpoint
    new cdk.CfnOutput(this, 'RedshiftClusterEndpoint', {
      value: `${redshiftCluster.attrEndpointAddress}:${redshiftCluster.attrEndpointPort}`,
      description: 'Redshift Cluster Endpoint',
    });

    // Output the cluster role ARN
    new cdk.CfnOutput(this, 'RedshiftClusterRoleArn', {
      value: redshiftRole.roleArn,
      description: 'Redshift Cluster IAM Role ARN',
    });


  }
}
