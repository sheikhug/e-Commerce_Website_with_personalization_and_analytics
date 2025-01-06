# E-commerce Website with AWS CDK

This project implements a scalable e-commerce analytics platform using AWS CDK. It processes clickstream data, handles order processing, and provides infrastructure for data analysis and personalization.

The platform leverages various AWS services to create a robust and scalable architecture for handling e-commerce data. It includes components for data ingestion, processing, storage, and analysis, enabling businesses to gain insights from customer interactions and optimize their e-commerce operations.

## Repository Structure

```
.
├── cdk
│   ├── bin
│   │   └── cdk.ts
│   ├── cdk.context.json
│   ├── cdk.json
│   ├── lib
│   │   ├── cdk-stack.ts
│   │   └── lambda
│   │       ├── clickstream
│   │       │   ├── index.ts
│   │       │   └── package.json
│   │       └── orderProcessing.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

### Key Files:
- `cdk/bin/cdk.ts`: Entry point for the CDK application
- `cdk/lib/cdk-stack.ts`: Main stack definition for the e-commerce analytics platform
- `cdk/lib/lambda/clickstream/index.ts`: Lambda function for processing clickstream data
- `cdk/lib/lambda/orderProcessing.ts`: Lambda function for processing orders

## Usage Instructions

### Installation

Prerequisites:
- Node.js (v14.x or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI (v2.x)

To install the project dependencies:

```bash
cd cdk
npm install
```

### Deployment

To deploy the stack:

```bash
cdk deploy
```

This command will synthesize the CloudFormation template and deploy the stack to your default AWS account and region.

### Configuration

The main configuration for the stack is in `cdk/lib/cdk-stack.ts`. You can modify this file to adjust the infrastructure resources according to your needs.

Key configuration points:
- S3 bucket for static content
- Cognito User Pool for authentication
- DynamoDB table for order storage
- Kinesis Data Stream for clickstream data
- Kinesis Firehose for data delivery to S3
- Lambda functions for data processing

### Data Flow

1. Clickstream data is ingested into the Kinesis Data Stream.
2. The ClickstreamProcessor Lambda function processes the data from the Kinesis stream.
3. Processed data is sent to Amazon Personalize for event tracking and to Kinesis Firehose for storage.
4. Kinesis Firehose delivers the data to an S3 bucket for long-term storage and analysis.
5. Orders are processed by the OrderProcessing Lambda function.
6. Order data is stored in DynamoDB and indexed in OpenSearch for quick retrieval and search capabilities.

```
[Clickstream Data] -> [Kinesis Stream] -> [ClickstreamProcessor Lambda] -> [Personalize / Firehose]
                                                                        -> [S3 Bucket]
[Order Data] -> [API Gateway] -> [OrderProcessing Lambda] -> [DynamoDB / OpenSearch]
```

### Troubleshooting

Common issues:
1. Deployment failures
   - Error: "Resource limit exceeded"
   - Solution: Check your AWS account limits and request increases if necessary

2. Lambda function errors
   - Problem: ClickstreamProcessor Lambda throwing exceptions
   - Diagnostic steps:
     1. Check CloudWatch Logs for the Lambda function
     2. Verify environment variables are set correctly
     3. Ensure IAM permissions are properly configured

3. Data flow issues
   - Problem: Data not appearing in S3 bucket
   - Steps to diagnose:
     1. Check Kinesis Data Stream metrics for incoming data
     2. Verify Kinesis Firehose delivery stream configuration
     3. Check S3 bucket permissions

For detailed error messages and logs, refer to the CloudWatch Logs for each component.

## Infrastructure

The infrastructure is defined using AWS CDK in TypeScript. Key resources include:

- S3:
  - WebsiteBucket: Stores static content for the e-commerce website
  - clickstreamBucket: Stores processed clickstream data

- Cognito:
  - UserPool: Manages user authentication and authorization

- DynamoDB:
  - OrdersTable: Stores order information

- Kinesis:
  - ClickstreamStream: Ingests real-time clickstream data

- Lambda:
  - ClickstreamProcessor: Processes clickstream data from Kinesis
  - OrderProcessing: Handles order processing and storage

- Firehose:
  - ClickstreamFirehose: Delivers clickstream data to S3

- CloudFront:
  - Distribution: Serves the static website content

- API Gateway:
  - EcommerceApi: Provides RESTful API for the e-commerce platform

- CloudWatch:
  - Alarms for monitoring Lambda function errors and throttles

The infrastructure is designed to be scalable and secure, with appropriate IAM roles and permissions set for each component.