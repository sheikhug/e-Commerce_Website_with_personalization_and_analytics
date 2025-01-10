
const personalize = require('aws-cdk-lib/aws-personalize');

const createSchema =  (scope,name) => {
    const schema =  new personalize.CfnSchema(scope, 'MyCfnSchema', {
        name: name,
        schema: JSON.stringify(
            {

                "type": "record",
                "name": "Interactions",
                "namespace": "com.amazonaws.personalize.schema",
                "fields": [
                    {
                        "name": "USER_ID",
                        "type": "string"
                    },
                    {
                        "name": "ITEM_ID",
                        "type": "string"
                    },
                    {
                        "name": "EVENT_TYPE",
                        "type": "string"
                    },
                    {
                        "name": "TIMESTAMP",
                        "type": "long"
                    }
                ],
                "version": "1.0"
            }
        )
    });
    return {
        arn : schema.attrSchemaArn
    }
}

module.exports = {createSchema}