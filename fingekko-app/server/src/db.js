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
    await mongoose.connect(uri);
    isConnected = true;
    usingMemory = false;
    return { usingMemory: false };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

function getDbStatus() {
  return { isConnected, usingMemory };
}

module.exports = { connectDb, getDbStatus, mongoose };
