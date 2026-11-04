
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import container from '../../src/container.js';
import { DBPool } from '../../src/config/index.js';


describe('API - Autenticación', () => {

  const server = container.resolve('app');
  const app = server.app;

  const testUser = {
    user_id: randomUUID(),
    name: 'API',
    lastname: 'Test',
    username: `api_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    email: `api.test.${randomUUID()}@example.com`,
    phone: null,
    password: 'TestPassword123!'
  };
  
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    await DBPool.query(
      `INSERT INTO users (
        user_id, name, lastname, username, email, phone, password, role_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testUser.user_id,
        testUser.name,
        testUser.lastname,
        testUser.username,
        testUser.email,
        testUser.phone,
        hashedPassword,
        5
      ]
    );
  });

  afterAll(async () => {
    try {
      await DBPool.query(
        'DELETE FROM users WHERE user_id = ?',
        [testUser.user_id]
      );
    } finally {
      await DBPool.end();
    }
  });

  describe('GET /auth/me', () => {

    test('Sin cookie devuelve 403', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'No autenticado'
      });
    });

    test('Con token inválido devuelve 400', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', 'access_token=token_invalido');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Token inválido o expirado'
      });
    });

  });

  describe('POST /auth/login', () => {

    test('Sin email devuelve 400', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: {
            password: testUser.password
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Email y contraseña son requeridos'
      });
    });

    test('Sin contraseña devuelve 400', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: {
            email: testUser.email
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Email y contraseña son requeridos'
      });
    });

    test('Con usuario inexistente devuelve 401', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: {
            email: 'usuario.inexistente@example.com',
            password: testUser.password
          }
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('Con contraseña incorrecta devuelve 401', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: {
            email: testUser.email,
            password: 'IncorrectPassword123!'
          }
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Contraseña incorrecta'
      });
    });

    test('Correcto devuelve 200 y cookie HttpOnly', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          user: {
            email: testUser.email,
            password: testUser.password,
            rememberMe: false
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Login exitoso.',
        user: {
          email: testUser.email
        }
      });

      const cookies = response.headers['set-cookie'];

      expect(cookies).toBeDefined();

      const accessTokenCookie = cookies.find(cookie =>
        cookie.startsWith('access_token=')
      );

      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toMatch(/HttpOnly/i);
      expect(accessTokenCookie).toMatch(/SameSite=Lax/i);
    });

  });

  describe('POST /auth/logout', () => {

    test('Sin cookie devuelve 403', async () => {
      const response = await request(app)
        .post('/auth/logout');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'No autenticado'
      });
    });

  });

  describe('Flujo completo de autenticación', () => {

    test('Login, consulta de usuario y logout', async () => {
      const agent = request.agent(app);

      // 1. Login
      const loginResponse = await agent
        .post('/auth/login')
        .send({
          user: {
            email: testUser.email,
            password: testUser.password,
            rememberMe: false
          }
        });

      expect(loginResponse.status).toBe(200);

      // 2. Consultar usuario autenticado
      const meResponse = await agent
        .get('/auth/me');

      expect(meResponse.status).toBe(200);

      expect(meResponse.body).toMatchObject({
        message: 'Usuario activo.',
        user: {
          user_id: testUser.user_id,
          name: testUser.name,
          lastname: testUser.lastname,
          username: testUser.username,
          email: testUser.email
        }
      });

      // 3. Logout
      const logoutResponse = await agent
        .post('/auth/logout');

      expect(logoutResponse.status).toBe(200);

      expect(logoutResponse.body).toEqual({
        message: 'Logout exitoso.',
        user: {}
      });

      // 4. Comprobar eliminación de cookie
      const cookies = logoutResponse.headers['set-cookie'];

      expect(cookies).toBeDefined();

      const accessTokenCookie = cookies.find(cookie =>
        cookie.startsWith('access_token=')
      );

      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toMatch(/access_token=;/);

      // 5. Intentar acceder después del logout
      const finalResponse = await agent
        .get('/auth/me');

      expect(finalResponse.status).toBe(403);
      expect(finalResponse.body).toEqual({
        error: 'No autenticado'
      });
    });
  });
});
