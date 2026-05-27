const mongoose = require('mongoose');

let isConnected = false;
let usingMemory = false;

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    usingMemory = true;
    return { usingMemory: true };
  }

  if (isConnected) {
    return { usingMemory: false };
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || undefined,
    });
    isConnected = true;
    usingMemory = false;
    return { usingMemory: false };
  } catch (error) {
    console.warn('Failed to connect to MongoDB. Falling back to in-memory storage.');
    isConnected = false;
    usingMemory = true;
    return { usingMemory: true };
  }
}

function getDbStatus() {
  return { isConnected, usingMemory };
}

module.exports = { connectDb, getDbStatus, mongoose };
