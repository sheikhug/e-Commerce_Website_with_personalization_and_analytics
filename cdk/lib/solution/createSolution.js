const personalize = require('aws-cdk-lib/aws-personalize');
const {getParam} = require("../../utils/config");

const createSolution = (scope, name, datasetGroupArn, dependency) => {
    const solution = new personalize.CfnSolution(scope, 'MyCfnSolution', {
        datasetGroupArn: datasetGroupArn,
        name: name,
        recipeArn: getParam('personalize.recipeArn'),

    });
    solution.addDependency(dependency)
    return {
        arn: solution.attrSolutionArn,
    }

}

module.exports = {createSolution}