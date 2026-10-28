const base = require('@railgun-qa/config');

module.exports = [...base, { ignores: ['.next/**'] }];
