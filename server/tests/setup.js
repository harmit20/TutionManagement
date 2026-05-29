// Runs before every test file (setupFilesAfterEnv).
// Provides an isolated in-memory MongoDB instance so tests never hit production.

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Minimal env so the app modules don't crash on import
process.env.NODE_ENV          = 'test';
process.env.JWT_SECRET        = 'test-jwt-secret-must-be-32-chars-long!';
process.env.JWT_REFRESH_SECRET= 'test-refresh-secret-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES= '7d';
process.env.CLIENT_ORIGIN     = 'http://localhost:3000';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  // Wipe all collections between tests for isolation
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
