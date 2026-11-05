
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import container from '../../src/container.js';
import { DBPool } from '../../src/config/index.js';



describe('API - Profile', () => {

  let agent;
  const server = container.resolve('app');
  const app = server.app;

  const testUser = {
    user_id: randomUUID(),
    name: 'API Profile',
    lastname: 'Test',
    username: `profile_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    email: `profile.${randomUUID()}@example.com`,
    phone: '600123456',
    password: 'TestPassword123!'
  };

  const secondaryUser = {
    user_id: randomUUID(),
    name: 'API Secondary',
    lastname: 'Test',
    username: `secondary_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    email: `secondary.${randomUUID()}@example.com`,
    phone: null,
    password: 'TestPassword123!'
  };

  const newPassword = 'NewTestPassword456!';

  const avatarDirectory = path.join(
    process.cwd(),
    'uploads',
    'avatars'
  );

  async function createAuthenticatedAgent(user) {
    const agent = request.agent(app);

    const response = await agent
      .post('/auth/login')
      .send({
        user: {
          email: user.email,
          password: user.password,
          rememberMe: false
        }
      });

    expect(response.status).toBe(200);

    return agent;
  }

  async function insertTestUser(user) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await DBPool.query(
      `INSERT INTO users (
        user_id, name, lastname, username, email, phone, password, role_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.user_id,
        user.name,
        user.lastname,
        user.username,
        user.email,
        user.phone,
        hashedPassword,
        5
      ]
    );
  }
  beforeAll(async () => {
    await insertTestUser(testUser);
    await insertTestUser(secondaryUser);

    agent = await createAuthenticatedAgent(testUser);
  });

  afterAll(async () => {
    try {
      await DBPool.query(
        'DELETE FROM users WHERE user_id IN (?, ?)',
        [testUser.user_id, secondaryUser.user_id]
      );

      // Limpiar posibles archivos de avatar de los usuarios de prueba
      const files = await fs.readdir(avatarDirectory).catch(() => []);

      for (const filename of files) {
        if (
          filename.startsWith(`${testUser.user_id}-`) ||
          filename.startsWith(`${secondaryUser.user_id}-`)
        ) {
          await fs.unlink(
            path.join(avatarDirectory, filename)
          ).catch(() => {});
        }
      }

    } finally {
      await DBPool.end();
    }
  });

  describe('Protección de rutas', () => {

    test.each([
      ['GET', '/perfil/ver'],
      ['GET', '/perfil/buscar/test'],
      ['POST', '/perfil/avatar'],
      ['PUT', '/perfil'],
      ['PUT', '/perfil/password'],
      ['DELETE', '/perfil/avatar'],
      ['DELETE', '/perfil']
    ])('%s %s sin cookie devuelve 401', async (method, endpoint) => {
      const response = await request(app)[method.toLowerCase()](endpoint);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'No autenticado'
      });
    });

  });

  describe('GET /perfil/ver', () => {

    test('Devuelve el perfil del usuario autenticado', async () => {
      const response = await agent
        .get('/perfil/ver');

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        message: 'Perfil encontrado',
        user: {
          user_id: testUser.user_id,
          name: testUser.name,
          lastname: testUser.lastname,
          username: testUser.username,
          email: testUser.email,
          phone: testUser.phone
        }
      });

      expect(response.body.user).not.toHaveProperty('password');
    });

  });

  describe('GET /perfil/buscar/:query', () => {

    test('Encuentra otros usuarios por nombre de usuario', async () => {
      const response = await agent
        .get(`/perfil/buscar/${secondaryUser.username}`)
        .query({ task_id: 0 });

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Perfiles encontrados (1)');

      expect(response.body.users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: secondaryUser.user_id,
            username: secondaryUser.username
          })
        ])
      );
    });

    test('No devuelve al propio usuario en los resultados', async () => {
      const response = await agent
        .get(`/perfil/buscar/${testUser.username}`)
        .query({ task_id: 0 });

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(0);
    });
  });

  describe('PUT /perfil', () => {

    test('Actualiza los datos del perfil', async () => {
      const updatedProfile = {
        name: 'API Updated',
        lastname: 'Profile Updated',
        username: `updated_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
        phone: '611222333'
      };

      const response = await agent
        .put('/perfil')
        .send({
          perfil: updatedProfile
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Perfil actualizado',
        user: updatedProfile
      });

      const [rows] = await DBPool.query(
        'SELECT name, lastname, username, phone FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      expect(rows[0]).toMatchObject(updatedProfile);

      // Mantener actualizados los datos locales de prueba
      Object.assign(testUser, updatedProfile);
    });
  });

  describe('PUT /perfil/password', () => {

    test('Con contraseña actual incorrecta devuelve 401', async () => {
      const response = await agent
        .put('/perfil/password')
        .send({
          password: {
            currentPassword: 'IncorrectPassword123!',
            newPassword
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Contraseña incorrecta'
      });
    });

    test('Con contraseña nueva igual a la actual devuelve 400', async () => {
      const response = await agent
        .put('/perfil/password')
        .send({
          password: {
            currentPassword: testUser.password,
            newPassword: testUser.password
          }
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'La nueva contraseña es igual que la anterior'
      });
    });

    test('Actualiza la contraseña correctamente', async () => {
      const response = await agent
        .put('/perfil/password')
        .send({
          password: {
            currentPassword: testUser.password,
            newPassword
          }
        });

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Perfil actualizado.');

      const [rows] = await DBPool.query(
        'SELECT password FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      expect(rows).toHaveLength(1);

      const passwordMatches = await bcrypt.compare(
        newPassword,
        rows[0].password
      );

      expect(passwordMatches).toBe(true);

      testUser.password = newPassword;
    });

  });

  describe('POST /perfil/avatar', () => {

    test('Sube una imagen correctamente', async () => {
      const imageBuffer = Buffer.from('test image content');

      const response = await agent
        .post('/perfil/avatar')
        .attach('avatar', imageBuffer, {
          filename: 'avatar-test.png',
          contentType: 'image/png'
        });

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Avatar actualizado');

      expect(response.body.user.avatar_url).toBeDefined();

      const filename = response.body.user.avatar_url;

      expect(filename).toContain(`${testUser.user_id}-`);

      const filePath = path.join(avatarDirectory, filename);

      const fileStats = await fs.stat(filePath);

      expect(fileStats.isFile()).toBe(true);

      const [rows] = await DBPool.query(
        'SELECT avatar_url FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      expect(rows[0].avatar_url).toBe(filename);
    });

    test('Rechaza archivos que no son imágenes', async () => {
      const response = await agent
        .post('/perfil/avatar')
        .attach('avatar', Buffer.from('test document'), {
          filename: 'document.txt',
          contentType: 'text/plain'
        });

      // Multer propaga el error al manejador de errores de Express.
      expect(response.status).toBe(500);

      const [rows] = await DBPool.query(
        'SELECT avatar_url FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      expect(rows[0].avatar_url).toBeDefined();
    });

  });

  describe('DELETE /perfil/avatar', () => {

    test('Elimina el avatar del usuario', async () => {
      const [rowsBefore] = await DBPool.query(
        'SELECT avatar_url FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      const filename = rowsBefore[0].avatar_url;

      expect(filename).toBeDefined();

      const response = await agent
        .delete('/perfil/avatar');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Perfil actualizado.',
        user: {
          avatar_url: null
        }
      });

      const [rowsAfter] = await DBPool.query(
        'SELECT avatar_url FROM users WHERE user_id = ?',
        [testUser.user_id]
      );

      expect(rowsAfter[0].avatar_url).toBeNull();

      await expect(
        fs.access(path.join(avatarDirectory, filename))
      ).rejects.toThrow();
    });

    test('Sin avatar devuelve 500', async () => {
      const response = await agent
        .delete('/perfil/avatar');

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        error: 'El usuario no tiene avatar'
      });
    });

  });

  describe('DELETE /perfil', () => {

    test('Elimina el perfil del usuario', async () => {
      const secondaryAgent = await createAuthenticatedAgent(secondaryUser);

      const response = await secondaryAgent
        .delete('/perfil');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Perfil eliminado.',
        user: {}
      });

      const [rows] = await DBPool.query(
        'SELECT user_id FROM users WHERE user_id = ?',
        [secondaryUser.user_id]
      );

      expect(rows).toHaveLength(0);
    });

  });

});
