// graphile-worker is ESM-only; Jest can require() it only with Node's VM modules enabled,
// which is why `npm test` runs jest through `node --experimental-vm-modules` (package.json).
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testRegex: '.*\\.spec\\.ts$',
};
