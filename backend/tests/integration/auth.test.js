const request = require('supertest');
const { createTestServer, setupDatabase } = require('../../test-server');
const { runQuery } = require('../../utils/database');

// Use a test database
process.env.DB_PATH = './test_tasker.db';

describe('Authentication Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Set up test database
    await setupDatabase();
    server = createTestServer();
    server.listen(0); // Use random available port
  });

  afterAll((done) => {
    server.close(() => {
      done();
    });
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await runQuery('DELETE FROM users WHERE email LIKE ?', ['test_%']);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', (done) => {
      const userData = {
        full_name: 'Test User',
        email: 'test_register@example.com',
        password: 'Password123!'
      };

      request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('message', 'User registered successfully');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.email).toBe(userData.email);
          done();
        });
    });

    it('should return error for missing fields', (done) => {
      const userData = {
        full_name: 'Test User',
        // Missing email and password
      };

      request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error');
          done();
        });
    });

    it('should return error for invalid email format', (done) => {
      const userData = {
        full_name: 'Test User',
        email: 'invalid-email',
        password: 'Password123!'
      };

      request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error');
          done();
        });
    });

    it('should return error for weak password', (done) => {
      const userData = {
        full_name: 'Test User',
        email: 'test_weak_password@example.com',
        password: '123'  // Too weak
      };

      request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error');
          done();
        });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user successfully', (done) => {
      // First, register a user
      const registerData = {
        full_name: 'Login Test User',
        email: 'test_login@example.com',
        password: 'Password123!'
      };

      request(server)
        .post('/api/auth/register')
        .send(registerData)
        .expect(201)
        .end((err, registerRes) => {
          if (err) return done(err);
          
          // Now try to login
          const loginData = {
            email: 'test_login@example.com',
            password: 'Password123!'
          };

          request(server)
            .post('/api/auth/login')
            .send(loginData)
            .expect(200)
            .end((err, loginRes) => {
              if (err) return done(err);
              
              expect(loginRes.body).toHaveProperty('message', 'Login successful');
              expect(loginRes.body).toHaveProperty('accessToken');
              expect(loginRes.body).toHaveProperty('user');
              expect(loginRes.body.user.email).toBe(loginData.email);
              done();
            });
        });
    });

    it('should return error for invalid credentials', (done) => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error', 'Invalid email or password');
          done();
        });
    });

    it('should return error for missing credentials', (done) => {
      const loginData = {
        // Missing email and password
      };

      request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          
          expect(res.body).toHaveProperty('error');
          done();
        });
    });
  });
});