const personalize = require('aws-cdk-lib/aws-personalize');

const createDatasetGroup =   (scope, name) => {
    const datasetGroup =  new personalize.CfnDatasetGroup(scope, 'MyCfnDatasetGroup', {
        name:  name
        /**Optional parameters:
         * domain: domain
         */
    });
    return {
        arn: datasetGroup.attrDatasetGroupArn,
        dsg: datasetGroup.ref
    }
}

module.exports = {createDatasetGroup}