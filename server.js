// eslint-disable-next-line import/no-extraneous-dependencies
const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! shutting down..');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  // .connect(process.env.DATABASE_LOCAL)
  .connect(DB)
  .then(() => {
    console.log('DB connection successful');
    // console.log(con.connection);
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log('app running on port 3000...');
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLE REJECTION! SHUTTING DOWN'); //if data base not connected succefully this can be done.
  server.close(() => {
    process.exit(1);
  });
});
