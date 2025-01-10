# E-commerce Website with the personalized recommendations and real-time analytics: AWS CDK

This project creates an AWS Personalize dataset group with associated resources and an API Gateway for interacting with the Personalize service.

The CDK stack sets up a complete infrastructure for an Amazon Personalize-based recommendation system, including dataset groups, schemas, datasets, solutions, and an API Gateway for various Personalize operations.

## Repository Structure

The repository is organized as follows:

- `bin/`: Contains the entry point for the CDK application
  - `createWebsite.js`: Main CDK application script
- `lib/`: Contains the core logic and stack definitions
  - `create_website-stack.js`: Defines the main CDK stack
  - `dataset/`: Dataset-related functionality
  - `datasetGroup/`: Dataset group creation logic
  - `orders/`: Order processing logic and Lambda functions
  - `presentation/`: API Gateway and Lambda function definitions
  - `schemas/`: Schema creation for Personalize
  - `solution/`: Personalize solution creation logic
- `cdk.out/`: Generated CDK output (not to be manually edited)
- `params/`: Configuration parameters
  - `develop.yml`: Development environment parameters
- `test/`: Contains test files
- `utils/`: Utility functions
  - `config.js`: Configuration management

## Usage Instructions

### Prerequisites

- Node.js (v14.x or later)
- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```

### Deployment

1. Bootstrap your AWS environment (if not already done):
   ```
   cdk bootstrap
   ```

2. Synthesize the CloudFormation template:
   ```
   cdk synth
   ```

3. Deploy the stack:
   ```
   cdk deploy
   ```

### API Endpoints

The API Gateway exposes the following endpoints:

- POST `/campaign`: Create a Personalize campaign
- POST `/eventTracker`: Create an event tracker
- POST `/solutionVersion`: Create a solution version
- POST `/putEvents`: Put events into Personalize
- GET `/getRecommendations`: Get recommendations
- DELETE `/deleteResources`: Delete Personalize resources
- POST `/describeSolutionVersion`: Describe a solution version
- POST `/describeCampaign`: Describe a campaign

### Configuration

The `params/develop.yml` file contains configuration parameters for the development environment. Modify this file to adjust settings such as:

- AWS account ID
- AWS region
- S3 bucket locations for dataset files
- Personalize recipe ARN

### Testing

Run the test suite using:

```
npm test
```

## Data Flow

The data flow in this application follows these steps:

1. User interactions are captured and sent to the API Gateway.
2. The API Gateway routes requests to appropriate Lambda functions.
3. Lambda functions interact with the Personalize service to perform operations like creating campaigns, getting recommendations, etc.
4. For real-time events, data is sent to a Kinesis data stream via the API Gateway.
5. The Kinesis stream can be used to process events in real-time or batch for updating the Personalize datasets.

```
[User] -> [API Gateway] -> [Lambda Functions] -> [Personalize Service]
                        -> [Kinesis Stream] -> [Event Processing]
```

## Infrastructure

The main infrastructure components defined in the CloudFormation template include:

- Personalize:
  - Dataset Group: "my-dsg-1"
  - Schemas: "my-schema" (Interactions), "my-item-schema" (Items)
  - Datasets: "dataset-interactions", "dataset-items"
  - Solution: "my-sol-from-cdk"
- IAM:
  - Role: "my-amazon-personalize-role" with permissions to access S3
- API Gateway:
  - REST API: "amazon-personalize-presentation-layer"
- Lambda:
  - Functions for each Personalize operation (createCampaign, getRecommendations, etc.)
- Kinesis:
  - Data Stream: "my-stream"

## Troubleshooting

- If you encounter permission issues, ensure that your AWS CLI is configured with the correct credentials and that you have the necessary permissions to create the resources.
- For API Gateway issues, check the CloudWatch logs for the associated Lambda functions.
- If Personalize operations fail, verify that your dataset files in S3 match the defined schemas and that the S3 bucket permissions are correctly set.