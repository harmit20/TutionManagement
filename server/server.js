require('dotenv').config();
const app          = require('./app');
const connectDB    = require('./config/db');
const { initFirebase }       = require('./config/firebase');
const { validateEnv }        = require('./utils/validateEnv');
const { scheduleJob: scheduleFeeReminder }  = require('./jobs/feeReminder.job');
const { scheduleJob: scheduleTestReminder } = require('./jobs/testReminder.job');

validateEnv();

connectDB()
  .then(() => {
    scheduleFeeReminder();
    scheduleTestReminder();
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

initFirebase();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
);
