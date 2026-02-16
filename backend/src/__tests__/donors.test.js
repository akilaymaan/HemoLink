import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import authRoutes from '../routes/auth.js';
import donorRoutes from '../routes/donors.js';
import { connectDb, disconnectDb } from '../db.js';

let mongoServer;
let app;
let token;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDb(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'd@donors.test', password: 'pass', name: 'Don', role: 'donor' });
  token = reg.body.token;
});

afterAll(async () => {
  await disconnectDb();
  await mongoServer.stop();
});

describe('POST /api/donors', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/donors').send({ bloodGroup: 'O+' });
    expect(res.status).toBe(401);
  });

  it('creates donor profile with bloodGroup', async () => {
    const res = await request(app)
      .post('/api/donors')
      .set('Authorization', `Bearer ${token}`)
      .send({ bloodGroup: 'O+', city: 'Mangalore', lat: 12.9, lng: 74.8, isAvailableNow: true });
    expect(res.status).toBe(200);
    expect(res.body.bloodGroup).toBe('O+');
    expect(res.body.isAvailableNow).toBe(true);
  });
});

describe('GET /api/donors', () => {
  it('returns list with eligibility and xaiReasons', async () => {
    const res = await request(app).get('/api/donors?bloodGroup=O+');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('eligibilityScore');
      expect(res.body[0]).toHaveProperty('xaiReasons');
    }
  });
});
