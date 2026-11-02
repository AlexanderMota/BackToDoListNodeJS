import request from 'supertest';
import container from '../../src/container.js';
import { DBPool } from '../../src/config/index.js';

const server = container.resolve('app');
const app = server.app;

afterAll(async () => {
  await DBPool.end();
});

describe('Disponibilidad', () => {
    test('Express responde a una petición HTTP', async () => {
    const response = await request(app)
        .get('/docs/')
        .redirects(1);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    });
});
