const yaml = require('js-yaml');
const fs = require('fs');
const _ = require('lodash');
const path = require('path');

const getParam = (configKey) => {
    if(!configKey) throw new Error('Error param missing');
    const paramsPath = path.join(
        __dirname,
        `../params/${process.env.ENVIRONMENT || 'develop'}.yml`
    );
    if (!fs.existsSync(paramsPath)) return {};
    const params = yaml.load(fs.readFileSync(paramsPath, 'utf8'));
    return _.get(params, configKey, params);
};

module.exports = { getParam };
