
import TaskController from '../../../src/controllers/TaskController.js';
import TaskService from '../../../src/services/TaskService.js';
import TaskRepository from '../../../src/repositories/TaskRepository.js';
import UserRepository from '../../../src/repositories/UserRepository.js';
import { DBPool } from '../../../src/config/dbconnection.js';

import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';

describe('TaskController', () => {
    let controller;
    let testUser1;
    let testUser2;
    let parentTaskId;
    let subTaskId;

    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
    });

    const getResponseBody = res => res.json.mock.calls[0]?.[0];

    beforeAll(async () => {
        controller = new TaskController({
            TaskService: new TaskService({
                TaskRepository: new TaskRepository({ DBPool })
            })
        });

        testUser1 = {
            user_id: randomUUID(),
            name: 'User1',
            lastname: 'Lastname1',
            username: `name1`,
            email: `usertask.controller1@test.com`,
            phone: null,
            password: 'password123'
        };
        testUser2 = {
            user_id: randomUUID(),
            name: 'User2',
            lastname: 'Lastname2',
            username: `name2`,
            email: `usertask.controller2@test.com`,
            phone: null,
            password: 'password234'
        };

        await DBPool.query(
            `INSERT INTO users (
                user_id, name, lastname, username, email, phone, password, role_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                testUser2.user_id,
                testUser2.name,
                testUser2.lastname,
                testUser2.username,
                testUser2.email,
                testUser2.phone,
                testUser2.password,
                5
            ]
        );

        await DBPool.query(
            `INSERT INTO users (
                user_id, name, lastname, username, email, phone, password, role_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                testUser1.user_id,
                testUser1.name,
                testUser1.lastname,
                testUser1.username,
                testUser1.email,
                testUser1.phone,
                testUser1.password,
                5
            ]
        );

        // Crear una tarea padre real en MySQL.
        const [parentResult] = await DBPool.query(
            `INSERT INTO tasks (
                name, description, status, priority,
                parent_task_id, created_by, visibility
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                'TaskController parent',
                'Tarea padre de integración',
                'pending',
                'medium',
                null,
                testUser1.user_id,
                'public'
            ]
        );

        parentTaskId = parentResult.insertId;

        // Crear una subtarea real.
        const [subTaskResult] = await DBPool.query(
            `INSERT INTO tasks (
                name, description, status, priority,
                parent_task_id, created_by, visibility
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                'TaskController subtask',
                'Subtarea de integración',
                'pending',
                'medium',
                parentTaskId,
                testUser1.user_id,
                'private'
            ]
        );

        subTaskId = subTaskResult.insertId;
    });

    afterAll(async () => {
        try {
            if (testUser1) {
                // Eliminar primero las subtareas y después las tareas padre.
                await DBPool.query(
                    'DELETE FROM tasks WHERE created_by = ? AND parent_task_id IS NOT NULL',
                    [testUser1.user_id]
                );

                await DBPool.query(
                    'DELETE FROM tasks WHERE created_by = ?',
                    [testUser1.user_id]
                );

                await DBPool.query(
                    'DELETE FROM users WHERE user_id = ?',
                    [testUser1.user_id]
                );

                await DBPool.query(
                    'DELETE FROM users WHERE user_id = ?',
                    [testUser2.user_id]
                );
            }
        } finally {
            await DBPool.end();
        }
    });

    describe('createTarea', () => {
        test('Debe crear una tarea correctamente', async () => {
            const task = {
                name: 'TaskController create',
                description: 'Tarea creada desde el controlador',
                status: 'pending',
                priority: 'medium',
                parent_task_id: null,
                visibility: 'private'
            };

            const req = {
                user: { user_id: testUser1.user_id },
                body: { task }
            };

            const res = createResponse();

            await controller.createTarea(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tarea creada exitosamente.');
            expect(response.task).toBeDefined();

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE name = ? AND created_by = ?',
                [task.name, testUser1.user_id]
            );

            expect(rows).toHaveLength(1);
            expect(rows[0].name).toBe(task.name);
            expect(rows[0].description).toBe(task.description);
            expect(rows[0].created_by).toBe(testUser1.user_id);

            await DBPool.query(
                'DELETE FROM tasks WHERE task_id = ?',
                [rows[0].task_id]
            );
        });

        test('Debe rechazar la creación si no hay usuario autenticado', async () => {
            const req = {
                body: {
                    task: {
                        name: 'TaskController unauthenticated',
                        description: 'No debe crearse'
                    }
                }
            };

            const res = createResponse();

            await controller.createTarea(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(getResponseBody(res)).toEqual({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('getParentTasks', () => {
        test('Debe devolver las tareas padre del usuario', async () => {
            const req = {
                user: { user_id: testUser1.user_id }
            };

            const res = createResponse();

            await controller.getParentTasks(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tareas encontradas.');
            expect(Array.isArray(response.tasks)).toBe(true);
            expect(
                response.tasks.some(task => task.task_id === parentTaskId)
            ).toBe(true);
        });

        test('Debe rechazar la consulta si no hay usuario autenticado', async () => {
            const res = createResponse();

            await controller.getParentTasks({ user: null }, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(getResponseBody(res)).toEqual({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('getSubTasks', () => {
        test('Debe devolver las subtareas de una tarea padre', async () => {
            const req = {
                user: { user_id: testUser1.user_id },
                params: { id: parentTaskId }
            };

            const res = createResponse();

            await controller.getSubTasks(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Subtareas encontradas.');
            expect(Array.isArray(response.tasks)).toBe(true);
            expect(
                response.tasks.some(task => task.task_id === subTaskId)
            ).toBe(true);
        });
    });

    describe('getTasksByCollaborating', () => {
        test('Debe devolver las tareas en las que colabora el usuario', async () => {
            const req = {
                user: { user_id: testUser1.user_id }
            };

            const res = createResponse();

            await controller.getTasksByCollaborating(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tareas encontradas.');
            expect(Array.isArray(response.tasks)).toBe(true);
        });
    });

    describe('getTasksByCollabRequest', () => {
        test('Debe devolver las tareas relacionadas con solicitudes de colaboración', async () => {
            const req = {
                user: { user_id: testUser1.user_id }
            };

            const res = createResponse();

            await controller.getTasksByCollabRequest(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tareas encontradas.');
            expect(Array.isArray(response.tasks)).toBe(true);
        });
    });

    describe('getPublicTasks', () => {
        test('Debe devolver las tareas públicas', async () => {

            const req = {
                user: { user_id: testUser2.user_id }
            };

            const res = createResponse();

            await controller.getPublicTasks(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tareas encontradas.');
            expect(Array.isArray(response.tasks)).toBe(true);
            expect(
                response.tasks.some(task => task.task_id === parentTaskId)
            ).toBe(true);
        });
    });

    describe('getTareaById', () => {
        test('Debe devolver una tarea existente', async () => {
            const req = {
                user: { user_id: testUser1.user_id },
                params: { id: parentTaskId }
            };

            const res = createResponse();

            await controller.getTareaById(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tarea encontrada.');
            expect(response.task).toBeDefined();
            expect(response.task.task_id).toBe(parentTaskId);
        });

        test('Debe devolver 404 si la tarea no existe', async () => {
            const req = {
                user: { user_id: testUser1.user_id },
                params: { id: 99999999999 }
            };

            const res = createResponse();

            await controller.getTareaById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(getResponseBody(res)).toEqual({
                error: 'Tarea no encontrada'
            });
        });
    });

    describe('getPriorities', () => {
        test('Debe devolver las prioridades disponibles', async () => {
            const req = {
                user: { user_id: testUser1.user_id }
            };

            const res = createResponse();

            await controller.getPriorities(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Prioridades encontradas.');
            expect(Array.isArray(response.priorities)).toBe(true);
        });
    });

    describe('getStatus', () => {
        test('Debe devolver los estados disponibles', async () => {
            const req = {
                user: { user_id: testUser1.user_id }
            };

            const res = createResponse();

            await controller.getStatus(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Status encontrados.');
            expect(Array.isArray(response.status)).toBe(true);
        });
    });

    describe('updateTarea', () => {
        test('Debe actualizar una tarea existente', async () => {
            const task = {
                name: 'TaskController updated',
                description: 'Descripción actualizada',
                status: 'inprogress',
                priority: 'high',
                parent_task_id: null,
                visibility: 'private'
            };

            const req = {
                user: { user_id: testUser1.user_id },
                params: { id: parentTaskId },
                body: { task }
            };

            const res = createResponse();

            await controller.updateTarea(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tarea actualizada exitosamente.');
            expect(response.task).toBeDefined();

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE task_id = ?',
                [parentTaskId]
            );

            expect(rows).toHaveLength(1);
            expect(rows[0].name).toBe(task.name);
            expect(rows[0].description).toBe(task.description);
        });

        test('Debe devolver 404 si la tarea no existe o no pertenece al usuario', async () => {
            const req = {
                user: { user_id: testUser1.user_id },
                params: { id: '99999999999' },
                body: {
                    task: {
                        name: 'No debe actualizarse'
                    }
                }
            };

            const res = createResponse();

            await controller.updateTarea(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(getResponseBody(res)).toEqual({
                error: 'Tarea no encontrada o propietario incorrecto'
            });
        });
    });

    describe('deleteTarea', () => {
        test('Debe eliminar una tarea existente', async () => {
            const taskId = '999999999';

            await DBPool.query(
                `INSERT INTO tasks (
                    task_id, name, description, status, priority,
                    parent_task_id, created_by, visibility
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    taskId,
                    'TaskController delete',
                    'Tarea para eliminar',
                    'pending',
                    'medium',
                    null,
                    testUser2.user_id,
                    'private'
                ]
            );

            const req = {
                user: { user_id: testUser2.user_id },
                params: { id: taskId }
            };

            const res = createResponse();

            await controller.deleteTarea(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = getResponseBody(res);

            expect(response.message).toBe('Tarea eliminada exitosamente.');

            const [rows] = await DBPool.query(
                'SELECT task_id FROM tasks WHERE task_id = ?',
                [taskId]
            );

            expect(rows).toHaveLength(0);
        });

        test('Debe devolver 404 si la tarea no existe o no pertenece al usuario', async () => {
            const req = {
                user: { user_id: testUser2.user_id },
                params: { id: '99999999999' }
            };

            const res = createResponse();

            await controller.deleteTarea(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(getResponseBody(res)).toEqual({
                error: 'Tarea no encontrada o propietario incorrecto'
            });
        });
    });
});
