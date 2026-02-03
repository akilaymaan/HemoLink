/**
 * Integration tests for all API endpoints and health check.
 * Uses in-memory MongoDB; ML service is not required (fallback rules used).
 */
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth.js';
import donorRoutes from '../routes/donors.js';
import requestRoutes from '../routes/requests.js';
import { connectDb, disconnectDb } from '../db.js';

let mongoServer;
let app;
let donorToken;
let seekerToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDb(mongoServer.getUri());
  app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);
  app.use('/api/requests', requestRoutes);
  const regDonor = await request(app)
    .post('/api/auth/register')
    .send({ email: 'donor@api.test', password: 'pass', name: 'Donor', role: 'donor' });
  donorToken = regDonor.body.token;
  const regSeeker = await request(app)
    .post('/api/auth/register')
    .send({ email: 'seeker@api.test', password: 'pass', name: 'Seeker', role: 'seeker' });
  seekerToken = regSeeker.body.token;
});

afterAll(async () => {
  await disconnectDb();
  await mongoServer.stop();
});

describe('GET /health', () => {
  it('returns 200 and ok: true', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /api/donors/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/donors/me');
    expect(res.status).toBe(401);
  });

  it('returns donor null when no profile yet', async () => {
    const res = await request(app)
      .get('/api/donors/me')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.donor).toBeNull();
  });

  it('returns donor with eligibilityScore and xaiReasons after profile exists', async () => {
    await request(app)
      .post('/api/donors')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ bloodGroup: 'O+', city: 'Mangalore', lat: 12.9, lng: 74.8, isAvailableNow: true });
    const res = await request(app)
      .get('/api/donors/me')
      .set('Authorization', `Bearer ${donorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.donor).not.toBeNull();
    expect(res.body.donor.bloodGroup).toBe('O+');
    expect(typeof res.body.donor.eligibilityScore).toBe('number');
    expect(Array.isArray(res.body.donor.xaiReasons)).toBe(true);
  }, 15000);
});

describe('GET /api/donors', () => {
  it('returns 200 and array with score/reasons for each donor', async () => {
    const res = await request(app).get('/api/donors?bloodGroup=O+');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach((d) => {
      expect(typeof d.eligibilityScore).toBe('number');
      expect(Array.isArray(d.xaiReasons)).toBe(true);
    });
  });

  it('filters by availableOnly and city', async () => {
    const res = await request(app).get('/api/donors?bloodGroup=O+&availableOnly=true&city=Mangalore');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/requests', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/requests');
    expect(res.status).toBe(401);
  });

  it('returns 200 and array for authenticated user', async () => {
    const res = await request(app)
      .get('/api/requests')
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/requests/match', () => {
  it('returns 400 when no bloodGroup or requestId', async () => {
    const res = await request(app).get('/api/requests/match');
    expect(res.status).toBe(400);
  });

  it('returns 404 for invalid requestId', async () => {
    const res = await request(app).get('/api/requests/match?requestId=000000000000000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 200 and donors array with scores when bloodGroup provided', async () => {
    const res = await request(app).get('/api/requests/match?bloodGroup=O+&lat=12.9&lng=74.8&radiusKm=50');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('donors');
    expect(Array.isArray(res.body.donors)).toBe(true);
    res.body.donors.forEach((d) => {
      expect(typeof d.eligibilityScore).toBe('number');
      expect(Array.isArray(d.xaiReasons)).toBe(true);
    });
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when email or password missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});
