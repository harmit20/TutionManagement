const request = require('supertest');
const app     = require('../app');
const User    = require('../models/User');

const TEST_EMAIL = 'admin@test.com';
const TEST_PASS  = 'TestPass@123';

async function createUser(role = 'admin') {
  return User.create({ name: 'Test User', email: TEST_EMAIL, passwordHash: TEST_PASS, role });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(() => createUser());

  it('returns 400 when body fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: TEST_PASS });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'WrongPass' });
    expect(res.status).toBe(401);
    // Both wrong-email and wrong-password return the same message (prevents user enumeration)
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 for deactivated user', async () => {
    await User.updateOne({ email: TEST_EMAIL }, { isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS });
    expect(res.status).toBe(401);
  });

  it('returns accessToken and user payload on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user).toMatchObject({ email: TEST_EMAIL, role: 'admin' });
    expect(res.body.user.passwordHash).toBeUndefined(); // never leak the hash
  });

  it('sets an httpOnly refreshToken cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS });
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('refreshToken');
    expect(cookie.toLowerCase()).toContain('httponly');
  });
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('returns 401 with no cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('issues a new accessToken when refresh cookie is valid', async () => {
    await createUser();
    const login = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASS });
    const cookie = login.headers['set-cookie'][0];

    const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

// ─── RBAC guard ───────────────────────────────────────────────────────────────

describe('RBAC: /api/admin/dashboard', () => {
  async function loginAs(role) {
    const email = `${role}@test.com`;
    await User.create({ name: role, email, passwordHash: TEST_PASS, role });
    const res = await request(app).post('/api/auth/login').send({ email, password: TEST_PASS });
    return `Bearer ${res.body.accessToken}`;
  }

  it('returns 200 for admin', async () => {
    const token = await loginAs('admin');
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', token);
    expect(res.status).toBe(200);
  });

  it('returns 403 for student', async () => {
    const token = await loginAs('student');
    const res = await request(app).get('/api/admin/dashboard').set('Authorization', token);
    expect(res.status).toBe(403);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
  });
});
