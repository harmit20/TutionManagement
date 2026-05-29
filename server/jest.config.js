module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000, // mongodb-memory-server can be slow on first run
  collectCoverageFrom: [
    'controllers/**/*.js',
    'utils/**/*.js',
    'jobs/**/*.js',
    '!**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov'],
};
