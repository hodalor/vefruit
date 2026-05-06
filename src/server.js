require('dotenv').config();

const app = require('./app');
const connectToDatabase = require('./config/db');

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`veFruit backend listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
