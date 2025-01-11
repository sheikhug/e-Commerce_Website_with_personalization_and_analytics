#!/usr/bin/env node

const cdk = require('aws-cdk-lib');
const { CreateWebsiteStack } = require('../lib/create_website-stack');
const { OrdersStack } = require("../lib/orders/orders-stack");

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION
};

// env: { account: '024848486969', region: 'us-east-1' },


const app = new cdk.App();
const webStack    = new CreateWebsiteStack(app, 'CreateWebsiteStack', {env});
const orderStack  = new OrdersStack(app, 'CreateOrderStrack', {env});

orderStack.addDependency(webStack);

