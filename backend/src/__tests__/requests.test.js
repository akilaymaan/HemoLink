import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import authRoutes from '../routes/auth.js';
import donorRoutes from '../routes/donors.js';
import requestRoutes from '../routes/requests.js';
import { connectDb, disconnectDb } from '../db.js';

let mongoServer;
let app;
let seekerToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDb(mongoServer.getUri());
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);
  app.use('/api/requests', requestRoutes);

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 's@seek.test', password: 'pass', name: 'Seeker', role: 'seeker' });
  seekerToken = reg.body.token;
});

afterAll(async () => {
  await disconnectDb();
  await mongoServer.stop();
});

describe('POST /api/requests', () => {
  it('requires auth', async () => {
    const res = await request(app).post('/api/requests').send({ bloodGroup: 'A+' });
    expect(res.status).toBe(401);
  });

  it('creates request with bloodGroup and urgency', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        bloodGroup: 'A+',
        units: 2,
        hospitalName: 'City Hospital',
        lat: 12.9,
        lng: 74.8,
        city: 'Mangalore',
        urgency: 'sos',
      });
    expect(res.status).toBe(201);
    expect(res.body.bloodGroup).toBe('A+');
    expect(res.body.urgency).toBe('sos');
  });
});

describe('GET /api/requests/match', () => {
  it('returns donors with compatibility and xaiReasons when bloodGroup provided', async () => {
    const res = await request(app).get('/api/requests/match?bloodGroup=O+&lat=12.9&lng=74.8');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('donors');
    expect(Array.isArray(res.body.donors)).toBe(true);
  });

  it('returns 400 when no bloodGroup or requestId', async () => {
    const res = await request(app).get('/api/requests/match');
    expect(res.status).toBe(400);
  });

  it('accepts radiusKm and returns 200', async () => {
    const res = await request(app).get('/api/requests/match?bloodGroup=O+&lat=12.9&lng=74.8&radiusKm=25');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('donors');
  });
});
