
const personalize = require('aws-cdk-lib/aws-personalize');

const createSchemaItem =  (scope,name) => {
    const schema =  new personalize.CfnSchema(scope, 'MyCfnItemSchema', {
        name: name,
        schema: JSON.stringify(
            {

                "type": "record",
                "name": "Items",
                "namespace": "com.amazonaws.personalize.schema",
                "fields": [
                    {
                        "name": "ITEM_ID",
                        "type": "string"
                    },
                    {
                        "name": "GENRE",
                        "type": ["null", "string"],
                        "categorical": true
                    }
                    ,
                    {
                        "name": "YEAR",
                        "type": "string"
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

module.exports = {createSchemaItem}