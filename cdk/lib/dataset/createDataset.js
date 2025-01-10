const personalize = require('aws-cdk-lib/aws-personalize');
const {getParam} = require("../../utils/config");
const {Role, ServicePrincipal, PolicyStatement, Effect} = require("aws-cdk-lib/aws-iam");
const {CfnParameter} = require("aws-cdk-lib");

const createDataset = (scope, datasetGroupArn, datasetType, name, schemaArn, itemSchema, domain) => {
    if (domain !== 'ECOMMERCE' || domain !== 'VIDEO_ON_DEMAND') {
        domain = ''
    }

    const role = new Role(scope, 'my-role',{
        assumedBy: new ServicePrincipal('personalize.amazonaws.com'),
        roleName: 'my-amazon-personalize-role'
    })

    const bucketARN = new CfnParameter(scope, 'bucketARN', {
        type: 'String',
        description: 'The bucket where the datasets are located',
    });
    const bucketObjectsARN = new CfnParameter(scope, 'bucketObjectsARN', {
        type: 'String',
        description: 'The bucket where the datasets are located',
    });
    role.addToPolicy(new PolicyStatement({
        actions: [     "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket"],
        resources: [
            bucketARN,bucketObjectsARN

        ],
        effect: Effect.ALLOW
    }))

    const interactionDataLocation = new CfnParameter(scope, 'interactionDataLocation', {
        type: 'String',
        description: 'interaction metadata location',
    });
    const dataset = new personalize.CfnDataset(scope, 'MyCfnDataset', {
        datasetGroupArn: datasetGroupArn,
        datasetType: datasetType,
        name: name,
        schemaArn: schemaArn,
        domain: domain,
        datasetImportJob: {
            dataSource: {
                DataLocation: interactionDataLocation
            },
            jobName: 'my-job-name-test',
            roleArn: role.roleArn
        }
    });
    const itemDataLocation = new CfnParameter(scope, 'itemDataLocation', {
        type: 'String',
        description: 'item metadata location',
    });
    const itemDataset = new personalize.CfnDataset(scope, 'MyCfnItemDataset', {
        datasetGroupArn: datasetGroupArn,
        datasetType: 'Items',
        name: 'dataset-items',
        schemaArn: itemSchema,
        datasetImportJob: {
            dataSource: {
                DataLocation: itemDataLocation
            },
            jobName: 'my-job-name-test-item',
            roleArn: role.roleArn
        }
    });

    return {
        arn: dataset.attrDatasetArn,
        ds: dataset
    }
}

module.exports = {createDataset}