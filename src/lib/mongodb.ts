import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/labelforge'

let conn: typeof mongoose | null = null
let promise: Promise<typeof mongoose> | null = null

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (conn) return conn

  if (!promise) {
    promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    }).catch((err) => {
      promise = null
      throw err
    })
  }

  try {
    conn = await promise
  } catch (err) {
    promise = null
    throw err
  }

  return conn
}
