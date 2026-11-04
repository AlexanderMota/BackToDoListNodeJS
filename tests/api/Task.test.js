
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';

import container from '../../src/container.js';
import { DBPool } from '../../src/config/index.js';



describe('API - Tasks', () => {

  const server = container.resolve('app');
  const app = server.app;

  const testUser = {
    user_id: randomUUID(),
    name: 'API Task',
    lastname: 'Test',
    username: `task_${randomUUID().replaceAll('-', '').slice(0, 12)}`,
    email: `task.${randomUUID()}@example.com`,
    phone: null,
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

  let agent;
  //let secondaryAgent;

  let parentTaskId;
  let subTaskId;
  let publicTaskId;
  let privateTaskId;
  let collaboratingTaskId;
  let invitationTaskId;

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

  async function createAuthenticatedAgent(user) {
    const authenticatedAgent = request.agent(app);

    const response = await authenticatedAgent
      .post('/auth/login')
      .send({
        user: {
          email: user.email,
          password: user.password,
          rememberMe: false
        }
      });

    expect(response.status).toBe(200);

    return authenticatedAgent;
  }

  async function insertTask({
    name,
    description = null,
    status = 'pending',
    priority = 'medium',
    parent_task_id = null,
    created_by,
    visibility = 'private'
  }) {
    const [result] = await DBPool.query(
      `INSERT INTO tasks (
        name,
        description,
        status,
        priority,
        parent_task_id,
        created_by,
        visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        status,
        priority,
        parent_task_id,
        created_by,
        visibility
      ]
    );

    return result.insertId;
  }



  beforeAll(async () => {
    
    await insertTestUser(testUser);
    await insertTestUser(secondaryUser);

    parentTaskId = await insertTask({
      name: 'Tarea principal de prueba',
      description: 'Tarea principal del usuario A',
      created_by: testUser.user_id,
      visibility: 'private'
    });

    subTaskId = await insertTask({
      name: 'Subtarea de prueba',
      description: 'Subtarea de la tarea principal',
      parent_task_id: parentTaskId,
      created_by: testUser.user_id
    });

    publicTaskId = await insertTask({
      name: 'Tarea pública de prueba',
      description: 'Tarea pública del usuario B',
      created_by: secondaryUser.user_id,
      visibility: 'public'
    });

    privateTaskId = await insertTask({
      name: 'Tarea privada de prueba',
      created_by: secondaryUser.user_id,
      visibility: 'private'
    });

    collaboratingTaskId = await insertTask({
      name: 'Tarea compartida de prueba',
      created_by: secondaryUser.user_id
    });

    invitationTaskId = await insertTask({
      name: 'Tarea con invitación de prueba',
      created_by: secondaryUser.user_id
    });

    await DBPool.query(
      `INSERT INTO user_tasks (user_id, task_id)
       VALUES (?, ?)`,
      [testUser.user_id, collaboratingTaskId]
    );

    await DBPool.query(
      `INSERT INTO requests_task (task_id, user_id, sender_user_id, status)
       VALUES (?, ?, ?, 'pending')`,
      [
        invitationTaskId,
        testUser.user_id,
        secondaryUser.user_id
      ]
    );

    agent = await createAuthenticatedAgent(testUser);
    //secondaryAgent = await createAuthenticatedAgent(secondaryUser);
  });

  afterAll(async () => {
    try {
      
      await DBPool.query(
        'DELETE FROM requests_task WHERE user_id IN (?, ?) OR sender_user_id IN (?, ?)',
        [
          testUser.user_id,
          secondaryUser.user_id,
          testUser.user_id,
          secondaryUser.user_id
        ]
      );

      await DBPool.query(
        'DELETE FROM user_tasks WHERE user_id IN (?, ?)',
        [testUser.user_id, secondaryUser.user_id]
      );

      await DBPool.query(
        `DELETE FROM tasks
         WHERE created_by IN (?, ?)
         AND parent_task_id IS NOT NULL`,
        [testUser.user_id, secondaryUser.user_id]
      );

      await DBPool.query(
        'DELETE FROM tasks WHERE created_by IN (?, ?)',
        [testUser.user_id, secondaryUser.user_id]
      );

      await DBPool.query(
        'DELETE FROM users WHERE user_id IN (?, ?)',
        [testUser.user_id, secondaryUser.user_id]
      );

    } finally {
      await DBPool.end();
    }
  });

  describe('Protección de rutas', () => {

    test.each([
      ['GET', '/tareas/principales'],
      ['GET', '/tareas/derivadas/1'],
      ['GET', '/tareas/colaborando'],
      ['GET', '/tareas/invitaciones'],
      ['GET', '/tareas/publicas'],
      ['GET', '/tareas/tarea/1'],
      ['GET', '/tareas/prioridades'],
      ['GET', '/tareas/estatus'],
      ['POST', '/tareas'],
      ['PUT', '/tareas/tarea/1'],
      ['DELETE', '/tareas/tarea/1']
    ])('%s %s sin cookie devuelve 403', async (method, endpoint) => {
      const response = await request(app)[method.toLowerCase()](endpoint);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'No autenticado'
      });
    });

  });

  describe('GET /tareas/principales', () => {

    test('Devuelve las tareas principales del usuario', async () => {
      const response = await agent
        .get('/tareas/principales');

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Tareas encontradas.');

      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: parentTaskId,
            name: 'Tarea principal de prueba',
            created_by: testUser.user_id,
            parent_task_id: null
          })
        ])
      );

      expect(response.body.tasks).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: subTaskId
          })
        ])
      );
    });

  });


  describe('GET /tareas/derivadas/:id', () => {

    test('Devuelve las subtareas de una tarea principal', async () => {
      const response = await agent
        .get(`/tareas/derivadas/${parentTaskId}`);

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Subtareas encontradas.');

      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: subTaskId,
            parent_task_id: parentTaskId,
            name: 'Subtarea de prueba'
          })
        ])
      );
    });

  });

  describe('GET /tareas/colaborando', () => {

    test('Devuelve las tareas en las que colabora el usuario', async () => {
      const response = await agent
        .get('/tareas/colaborando');

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Tareas encontradas.');

      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: collaboratingTaskId,
            name: 'Tarea compartida de prueba'
          })
        ])
      );
    });

  });


  describe('GET /tareas/invitaciones', () => {

    test('Devuelve las invitaciones pendientes del usuario', async () => {
      const response = await agent
        .get('/tareas/invitaciones');

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Tareas encontradas.');

      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: invitationTaskId,
            name: 'Tarea con invitación de prueba'
          })
        ])
      );
    });

  });

  describe('GET /tareas/publicas', () => {

    test('Devuelve las tareas públicas de otros usuarios', async () => {
      const response = await agent
        .get('/tareas/publicas');

      expect(response.status).toBe(200);

      expect(response.body.message).toBe('Tareas encontradas.');

      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: publicTaskId,
            name: 'Tarea pública de prueba',
            visibility: 'public'
          })
        ])
      );

      expect(response.body.tasks).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            task_id: privateTaskId
          })
        ])
      );
    });

  });

  describe('GET /tareas/tarea/:id', () => {

    test('Devuelve una tarea propia', async () => {
      const response = await agent
        .get(`/tareas/tarea/${parentTaskId}`);

      expect(response.status).toBe(200);

      expect(response.body).toMatchObject({
        message: 'Tarea encontrada.',
        task: {
          task_id: parentTaskId,
          name: 'Tarea principal de prueba',
          created_by: testUser.user_id
        }
      });
    });

    test('Permite consultar una tarea pública de otro usuario', async () => {
      const response = await agent
        .get(`/tareas/tarea/${publicTaskId}`);

      expect(response.status).toBe(200);

      expect(response.body.task).toMatchObject({
        task_id: publicTaskId,
        visibility: 'public'
      });
    });

    test('Permite consultar una tarea compartida', async () => {
      const response = await agent
        .get(`/tareas/tarea/${collaboratingTaskId}`);

      expect(response.status).toBe(200);

      expect(response.body.task.task_id).toBe(collaboratingTaskId);
    });

    test('Permite consultar una tarea con invitación pendiente', async () => {
      const response = await agent
        .get(`/tareas/tarea/${invitationTaskId}`);

      expect(response.status).toBe(200);

      expect(response.body.task.task_id).toBe(invitationTaskId);
    });

    test('Una tarea inexistente devuelve 404', async () => {
      const response = await agent
        .get('/tareas/tarea/999999');

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        error: 'Tarea no encontrada'
      });
    });

  });


  describe('GET /tareas/prioridades', () => {

    test('Devuelve las prioridades disponibles', async () => {
      const response = await agent
        .get('/tareas/prioridades');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Prioridades encontradas.',
        priorities: [
          'very_low',
          'low',
          'medium',
          'high',
          'critical'
        ]
      });
    });

  });


  describe('GET /tareas/estatus', () => {

    test('Devuelve los estados disponibles', async () => {
      const response = await agent
        .get('/tareas/estatus');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Status encontrados.',
        status: [
          'pending',
          'done',
          'inprogress',
          'paused',
          'canceled'
        ]
      });
    });

  });


  describe('POST /tareas', () => {

    test('Crea una tarea correctamente', async () => {
      const newTask = {
        name: 'Nueva tarea desde API',
        description: 'Tarea creada mediante Supertest',
        status: 'pending',
        priority: 'high',
        parent_task_id: null,
        visibility: 'private'
      };

      const response = await agent
        .post('/tareas')
        .send({
          task: newTask
        });

      expect(response.status).toBe(201);

      expect(response.body.message).toBe('Tarea creada exitosamente.');

      expect(response.body.task).toMatchObject({
        ...newTask,
        created_by: testUser.user_id
      });

      expect(response.body.task.task_id).toBeDefined();

      const [rows] = await DBPool.query(
        'SELECT * FROM tasks WHERE task_id = ?',
        [response.body.task.task_id]
      );

      expect(rows).toHaveLength(1);

      expect(rows[0]).toMatchObject({
        name: newTask.name,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        created_by: testUser.user_id,
        visibility: newTask.visibility
      });
    });

  });


  describe('PUT /tareas/tarea/:id', () => {

    test('Actualiza una tarea propia', async () => {
      const updatedTask = {
        name: 'Tarea principal actualizada',
        description: 'Descripción actualizada',
        status: 'inprogress',
        priority: 'critical',
        parent_task_id: null,
        visibility: 'public'
      };

      const response = await agent
        .put(`/tareas/tarea/${parentTaskId}`)
        .send({
          task: updatedTask
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Tarea actualizada exitosamente.',
        task: {
          task_id: String(parentTaskId),
          ...updatedTask
        }
      });

      const [rows] = await DBPool.query(
        'SELECT * FROM tasks WHERE task_id = ?',
        [parentTaskId]
      );

      expect(rows[0]).toMatchObject(updatedTask);
    });

    test('No permite actualizar una tarea de otro usuario', async () => {
      const response = await agent
        .put(`/tareas/tarea/${privateTaskId}`)
        .send({
          task: {
            name: 'Intento de modificación',
            description: 'No debería actualizarse',
            status: 'pending',
            priority: 'low',
            parent_task_id: null,
            visibility: 'private'
          }
        });

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        error: 'Tarea no encontrada o propietario incorrecto'
      });

      const [rows] = await DBPool.query(
        'SELECT name FROM tasks WHERE task_id = ?',
        [privateTaskId]
      );

      expect(rows[0].name).toBe('Tarea privada de prueba');
    });

  });

  describe('DELETE /tareas/tarea/:id', () => {

    test('No permite eliminar una tarea de otro usuario', async () => {
      const response = await agent
        .delete(`/tareas/tarea/${privateTaskId}`);

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        error: 'Tarea no encontrada o propietario incorrecto'
      });

      const [rows] = await DBPool.query(
        'SELECT task_id FROM tasks WHERE task_id = ?',
        [privateTaskId]
      );

      expect(rows).toHaveLength(1);
    });

    test('Elimina una tarea propia', async () => {
      const taskToDeleteId = await insertTask({
        name: 'Tarea que será eliminada',
        created_by: testUser.user_id
      });

      const response = await agent
        .delete(`/tareas/tarea/${taskToDeleteId}`);

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        message: 'Tarea eliminada exitosamente.',
        task: true
      });

      const [rows] = await DBPool.query(
        'SELECT task_id FROM tasks WHERE task_id = ?',
        [taskToDeleteId]
      );

      expect(rows).toHaveLength(0);
    });

  });

});
