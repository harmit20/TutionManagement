const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');

(async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'tuition_management' },
  });
  const uri = mongod.getUri();
  fs.writeFileSync('/private/tmp/claude-501/-Users-latikaraut/7451a49e-e0fd-40a0-844b-de22855b47bd/scratchpad/mongo-memory-uri.txt', uri);
  console.log('MONGO_MEMORY_SERVER_READY', uri);
})();
