import mongoose from 'mongoose';

export async function connectDb(uri) {
  await mongoose.connect(uri || process.env.MONGODB_URI);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
