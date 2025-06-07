export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    'services/**/*.js',
    '!node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 15000, // 15 seconds for ElevenLabs tests
  verbose: true,
  transform: {},
  extensionsToTreatAsEsm: ['.js']
};