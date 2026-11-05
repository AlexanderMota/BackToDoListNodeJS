import TaskRepository from '../../../src/repositories/TaskRepository.js';
import { DBPool } from '../../../src/config/dbconnection.js';
import { randomUUID } from 'node:crypto';



describe('TaskRepository', () => {
    const taskRepository = new TaskRepository({DBPool});

    let createdUsers = [];
    let createdTasks = [];

    const createTestUser = () => {
        
        const uniqueId = randomUUID();

        return {
            user_id: uniqueId,
            name: 'Test',
            lastname: 'User',
            username: `testuser_${uniqueId}`,
            email: `task.user.${uniqueId}@example.com`,
            phone: '600000000',
            password: 'password123'
        };
    };


    const createTestTask = (user_id, suffix, extra = {}) => ({
        name: `Tarea Test ${suffix}`,
        description: `Descripción de prueba ${suffix}`,
        status: 'pending',
        priority: 'medium',
        parent_task_id: null,
        created_by: user_id,
        visibility: 'private',
        ...extra
    });


    const insertTestUser = async (user) => {

        await DBPool.query(`
            INSERT INTO users (
                user_id,
                name,
                lastname,
                username,
                email,
                phone,
                password,
                role_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user.user_id,
            user.name,
            user.lastname,
            user.username,
            user.email,
            user.phone,
            user.password,
            5
        ]);
    };


    const createUser = async () => {
        const user = createTestUser();

        await insertTestUser(user);

        createdUsers.push(user.user_id);

        return user;
    };

    const createTask = async (created_by, overrides = {}) => {
        const task = await taskRepository.create({
            name: 'Tarea de prueba',
            description: 'Descripción de prueba',
            status: 'pending',
            priority: 'medium',
            parent_task_id: null,
            created_by,
            visibility: 'private',
            ...overrides
        });

        createdTasks.push(task.task_id);

        return task;
    };

    beforeEach(() => {
        createdUsers = [];
        createdTasks = [];
    });

    afterEach(async () => {
        const taskIds = [...createdTasks];
        const userIds = [...createdUsers];

        const placeholders = (ids) => ids.map(() => '?').join(',');

        // Limpiar solicitudes y colaboraciones.
        for (const table of ['requests_task', 'user_tasks']) {
            const conditions = [];
            const params = [];

            if (taskIds.length) {
                conditions.push(`task_id IN (${placeholders(taskIds)})`);
                params.push(...taskIds);
            }

            if (userIds.length) {
                conditions.push(`user_id IN (${placeholders(userIds)})`);
                params.push(...userIds);
            }

            if (conditions.length) {
                await DBPool.query(
                    `DELETE FROM ${table} WHERE ${conditions.join(' OR ')}`,
                    params
                );
            }
        }

        // Eliminar primero las subtareas y después las principales.
        for (const taskId of [...taskIds].reverse()) {
            await DBPool.query(
                'DELETE FROM tasks WHERE task_id = ?',
                [taskId]
            );
        }

        for (const userId of userIds) {
            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [userId]
            );
        }
    });




    describe('create', () => {

        test('debería crear una tarea correctamente', async () => {

            const user = createTestUser('create');

            await insertTestUser(user);

            const tarea = createTestTask(
                user.user_id,
                'create'
            );

            const result = await taskRepository.create(tarea);

            expect(result).toEqual(
                expect.objectContaining({
                    task_id: expect.any(Number),
                    name: tarea.name,
                    description: tarea.description,
                    status: tarea.status,
                    priority: tarea.priority,
                    parent_task_id: tarea.parent_task_id,
                    created_by: tarea.created_by,
                    visibility: tarea.visibility
                })
            );

            await taskRepository.delete(
                result.task_id,
                user.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });

    });


    describe('findParentTasksByUserID', () => {

        test('debería devolver las tareas principales de un usuario', async () => {

            const user = createTestUser('parents');

            await insertTestUser(user);

            const parentTask = await taskRepository.create(
                createTestTask(user.user_id, 'parent')
            );

            const anotherUser = createTestUser('parents-other');

            await insertTestUser(anotherUser);

            await taskRepository.create(
                createTestTask(anotherUser.user_id, 'other')
            );

            const result =
                await taskRepository.findParentTasksByUserID(
                    user.user_id
                );

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        task_id: parentTask.task_id,
                        created_by: user.user_id,
                        parent_task_id: null
                    })
                ])
            );

            expect(
                result.some(
                    task => task.created_by === anotherUser.user_id
                )
            ).toBe(false);

            await DBPool.query(
                'DELETE FROM tasks WHERE task_id IN (?, ?)',
                [
                    parentTask.task_id,
                    (await taskRepository.findParentTasksByUserID(
                        anotherUser.user_id
                    ))[0].task_id
                ]
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [user.user_id, anotherUser.user_id]
            );
        });

    });


    describe('findSubTasks', () => {

        test('Debe devolver las subtareas de una tarea principal', async () => {

            const user = createTestUser('subtasks');

            await insertTestUser(user);

            const parentTask = await taskRepository.create(
                createTestTask(user.user_id, 'parent-subtask')
            );

            const subTask = await taskRepository.create(
                createTestTask(
                    user.user_id,
                    'subtask',
                    {
                        parent_task_id: parentTask.task_id
                    }
                )
            );

            const result =
                await taskRepository.findSubTasks(
                    parentTask.task_id,
                    user.user_id
                );

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        task_id: subTask.task_id,
                        parent_task_id: parentTask.task_id
                    })
                ])
            );

            await taskRepository.delete(
                subTask.task_id,
                user.user_id
            );

            await taskRepository.delete(
                parentTask.task_id,
                user.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });



        test('El propietario de la tarea principal debe poder ver todas sus subtareas', async () => {
            const owner = await createUser();

            const parentTask = await createTask(owner.user_id);

            const privateSubTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'private'
            });

            const publicSubTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'public'
            });

            const result = await taskRepository.findSubTasks(
                parentTask.task_id,
                owner.user_id
            );

            expect(result).toHaveLength(2);

            expect(result.map(task => task.task_id)).toEqual(
                expect.arrayContaining([
                    privateSubTask.task_id,
                    publicSubTask.task_id
                ])
            );
        });


        test('Un colaborador solo debe ver las subtareas públicas o aquellas en las que colabora', async () => {
            const owner = await createUser();
            const collaborator = await createUser();

            const parentTask = await createTask(owner.user_id);

            const privateSubTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'private'
            });

            const publicSubTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'public'
            });

            const collaboratingSubTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'private'
            });

            // El usuario colabora en la tarea principal.
            await DBPool.query(
                'INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)',
                [collaborator.user_id, parentTask.task_id]
            );

            // También colabora en una de las subtareas privadas.
            await DBPool.query(
                'INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)',
                [collaborator.user_id, collaboratingSubTask.task_id]
            );

            const result = await taskRepository.findSubTasks(
                parentTask.task_id,
                collaborator.user_id
            );

            expect(result).toHaveLength(2);

            const returnedIds = result.map(task => task.task_id);

            expect(returnedIds).toContain(publicSubTask.task_id);
            expect(returnedIds).toContain(collaboratingSubTask.task_id);
            expect(returnedIds).not.toContain(privateSubTask.task_id);
        });


        test('Un usuario sin acceso a la tarea principal no debe poder consultar sus subtareas', async () => {
            const owner = await createUser();
            const unauthorizedUser = await createUser();

            const parentTask = await createTask(owner.user_id);

            // Aunque la subtarea sea pública, no se puede acceder
            // a través de una tarea principal privada sin autorización.
            await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id,
                visibility: 'public'
            });

            await expect(
                taskRepository.findSubTasks(
                    parentTask.task_id,
                    unauthorizedUser.user_id
                )
            ).rejects.toThrow('No tienes permiso para acceder a esta tarea');
        });

    });

    describe('findPublicTasks', () => {

        test('debería devolver tareas públicas de otros usuarios', async () => {

            const owner = createTestUser('public-owner');
            const viewer = createTestUser('public-viewer');

            await insertTestUser(owner);
            await insertTestUser(viewer);

            const publicTask = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'public',
                    {
                        visibility: 'public'
                    }
                )
            );

            const privateTask = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'private',
                    {
                        visibility: 'private'
                    }
                )
            );

            const result =
                await taskRepository.findPublicTasks(
                    viewer.user_id
                );

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        task_id: publicTask.task_id,
                        visibility: 'public'
                    })
                ])
            );

            expect(
                result.some(
                    task => task.task_id === privateTask.task_id
                )
            ).toBe(false);

            await taskRepository.delete(
                publicTask.task_id,
                owner.user_id
            );

            await taskRepository.delete(
                privateTask.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, viewer.user_id]
            );
        });


        test('no debería devolver las tareas públicas del propio usuario', async () => {

            const user = createTestUser('public-owner-only');

            await insertTestUser(user);

            const publicTask = await taskRepository.create(
                createTestTask(
                    user.user_id,
                    'own-public',
                    {
                        visibility: 'public'
                    }
                )
            );

            const result =
                await taskRepository.findPublicTasks(
                    user.user_id
                );

            expect(
                result.some(
                    task => task.task_id === publicTask.task_id
                )
            ).toBe(false);

            await taskRepository.delete(
                publicTask.task_id,
                user.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });



        test('Debe excluir tareas con solicitudes pendientes o aceptadas, pero mostrar las rechazadas y sin solicitud', async () => {
            const owner = await createUser();
            const requester = await createUser();

            const pendingTask = await createTask(owner.user_id, {
                visibility: 'public'
            });

            const acceptedTask = await createTask(owner.user_id, {
                visibility: 'public'
            });

            const declinedTask = await createTask(owner.user_id, {
                visibility: 'public'
            });

            const cancelledTask = await createTask(owner.user_id, {
                visibility: 'public'
            });

            const noRequestTask = await createTask(owner.user_id, {
                visibility: 'public'
            });

            // Crear solicitudes.
            await DBPool.query(
                `INSERT INTO requests_task (task_id, user_id, status)
                VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)`,
                [
                    pendingTask.task_id, requester.user_id, 'pending',
                    acceptedTask.task_id, requester.user_id, 'accepted',
                    declinedTask.task_id, requester.user_id, 'declined',
                    cancelledTask.task_id, requester.user_id, 'pending'
                ]
            );

            await DBPool.query(
                'DELETE FROM requests_task WHERE task_id = ? AND user_id = ?',
                [cancelledTask.task_id, requester.user_id]
            );

            const result = await taskRepository.findPublicTasks(
                requester.user_id
            );

            const returnedIds = result.map(task => task.task_id);

            expect(returnedIds).not.toContain(pendingTask.task_id);
            expect(returnedIds).not.toContain(acceptedTask.task_id);

            expect(returnedIds).toContain(declinedTask.task_id);
            expect(returnedIds).toContain(cancelledTask.task_id);
            expect(returnedIds).toContain(noRequestTask.task_id);
        });

    });


    describe('findTasksByCollaborating', () => {

        test('debería devolver las tareas en las que el usuario colabora', async () => {

            const owner = createTestUser('collab-owner');
            const collaborator = createTestUser('collab-user');

            await insertTestUser(owner);
            await insertTestUser(collaborator);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'collaborating'
                )
            );

            await DBPool.query(`
                INSERT INTO user_tasks (
                    user_id,
                    task_id
                )
                VALUES (?, ?)
            `, [
                collaborator.user_id,
                task.task_id
            ]);

            const result =
                await taskRepository.findTasksByCollaborating(
                    collaborator.user_id
                );

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        task_id: task.task_id
                    })
                ])
            );

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, collaborator.user_id]
            );
        });

    });


    describe('findTasksByCollabRequest', () => {

        test('debería devolver las tareas con una solicitud pendiente', async () => {

            const owner = createTestUser('request-owner');
            const requester = createTestUser('request-user');

            await insertTestUser(owner);
            await insertTestUser(requester);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'request'
                )
            );

            await DBPool.query(`
                INSERT INTO requests_task (
                    task_id,
                    user_id,
                    status
                )
                VALUES (?, ?, 'pending')
            `, [
                task.task_id,
                requester.user_id
            ]);

            const result =
                await taskRepository.findTasksByCollabRequest(
                    requester.user_id
                );

            expect(result).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        task_id: task.task_id
                    })
                ])
            );

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, requester.user_id]
            );
        });


        test('no debería devolver solicitudes aceptadas', async () => {

            const owner = createTestUser('accepted-owner');
            const requester = createTestUser('accepted-user');

            await insertTestUser(owner);
            await insertTestUser(requester);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'accepted'
                )
            );

            await DBPool.query(`
                INSERT INTO requests_task (
                    task_id,
                    user_id,
                    status
                )
                VALUES (?, ?, 'accepted')
            `, [
                task.task_id,
                requester.user_id
            ]);

            const result =
                await taskRepository.findTasksByCollabRequest(
                    requester.user_id
                );

            expect(
                result.some(
                    item => item.task_id === task.task_id
                )
            ).toBe(false);

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, requester.user_id]
            );
        });

    });


    describe('findById', () => {

        test('debería devolver una tarea al usuario propietario', async () => {

            const user = createTestUser('find-owner');

            await insertTestUser(user);

            const task = await taskRepository.create(
                createTestTask(
                    user.user_id,
                    'find-owner'
                )
            );

            const result =
                await taskRepository.findById(
                    task.task_id,
                    user.user_id
                );

            expect(result).toEqual(
                expect.objectContaining({
                    task_id: task.task_id,
                    created_by: user.user_id,
                    username: user.username
                })
            );

            await taskRepository.delete(
                task.task_id,
                user.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });


        test('debería permitir acceder a una tarea siendo colaborador', async () => {

            const owner = createTestUser('find-collab-owner');
            const collaborator = createTestUser('find-collab-user');

            await insertTestUser(owner);
            await insertTestUser(collaborator);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'find-collab'
                )
            );

            await DBPool.query(`
                INSERT INTO user_tasks (
                    user_id,
                    task_id
                )
                VALUES (?, ?)
            `, [
                collaborator.user_id,
                task.task_id
            ]);

            const result =
                await taskRepository.findById(
                    task.task_id,
                    collaborator.user_id
                );

            expect(result.task_id).toBe(task.task_id);

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, collaborator.user_id]
            );
        });


        test('debería permitir acceder a una tarea con solicitud pendiente', async () => {

            const owner = createTestUser('find-pending-owner');
            const requester = createTestUser('find-pending-user');

            await insertTestUser(owner);
            await insertTestUser(requester);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'find-pending'
                )
            );

            await DBPool.query(`
                INSERT INTO requests_task (
                    task_id,
                    user_id,
                    status
                )
                VALUES (?, ?, 'pending')
            `, [
                task.task_id,
                requester.user_id
            ]);

            const result =
                await taskRepository.findById(
                    task.task_id,
                    requester.user_id
                );

            expect(result.task_id).toBe(task.task_id);

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, requester.user_id]
            );
        });


        test('debería permitir acceder a una tarea pública', async () => {

            const owner = createTestUser('find-public-owner');
            const viewer = createTestUser('find-public-viewer');

            await insertTestUser(owner);
            await insertTestUser(viewer);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'find-public',
                    {
                        visibility: 'public'
                    }
                )
            );

            const result =
                await taskRepository.findById(
                    task.task_id,
                    viewer.user_id
                );

            expect(result.task_id).toBe(task.task_id);
            expect(result.username).toBe(owner.username);

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, viewer.user_id]
            );
        });


        test('debería rechazar el acceso de un usuario sin permisos', async () => {

            const owner = createTestUser('find-denied-owner');
            const otherUser = createTestUser('find-denied-user');

            await insertTestUser(owner);
            await insertTestUser(otherUser);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'find-denied'
                )
            );

            await expect(
                taskRepository.findById(
                    task.task_id,
                    otherUser.user_id
                )
            ).rejects.toThrow(
                'No tienes permiso para acceder a esta tarea'
            );

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, otherUser.user_id]
            );
        });


        test('debería lanzar error si la tarea no existe', async () => {

            await expect(
                taskRepository.findById(
                    999999,
                    'user-id-que-no-existe'
                )
            ).rejects.toThrow(
                'Tarea no encontrada'
            );
        });

    });


    describe('findPriorities', () => {

        test('debería devolver las prioridades definidas en la tabla tasks', async () => {

            const result =
                await taskRepository.findPriorities();

            expect(result).toEqual([
                'very_low',
                'low',
                'medium',
                'high',
                'critical'
            ]);
        });

    });


    describe('findStatus', () => {

        test('debería devolver los estados definidos en la tabla tasks', async () => {

            const result =
                await taskRepository.findStatus();

            expect(result).toEqual([
                'pending',
                'done',
                'inprogress',
                'paused',
                'canceled'
            ]);
        });

    });


    describe('update', () => {

        test('debería actualizar una tarea correctamente', async () => {

            const user = createTestUser('update');

            await insertTestUser(user);

            const task = await taskRepository.create(
                createTestTask(
                    user.user_id,
                    'update'
                )
            );

            const updatedTask = {
                name: 'Tarea Actualizada',
                description: 'Descripción actualizada',
                status: 'inprogress',
                priority: 'high',
                parent_task_id: null,
                visibility: 'public'
            };

            const result =
                await taskRepository.update(
                    task.task_id,
                    updatedTask,
                    user.user_id
                );

            expect(result).toEqual({
                task_id: task.task_id,
                ...updatedTask
            });

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE task_id = ?',
                [task.task_id]
            );

            expect(rows[0].name).toBe(updatedTask.name);
            expect(rows[0].description).toBe(updatedTask.description);
            expect(rows[0].status).toBe(updatedTask.status);
            expect(rows[0].priority).toBe(updatedTask.priority);
            expect(rows[0].visibility).toBe(updatedTask.visibility);

            await taskRepository.delete(
                task.task_id,
                user.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });


        test('debería devolver null si la tarea no pertenece al usuario', async () => {

            const owner = createTestUser('update-owner');
            const otherUser = createTestUser('update-other');

            await insertTestUser(owner);
            await insertTestUser(otherUser);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'update-denied'
                )
            );

            const result =
                await taskRepository.update(
                    task.task_id,
                    createTestTask(
                        otherUser.user_id,
                        'not-used'
                    ),
                    otherUser.user_id
                );

            expect(result).toBeNull();

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, otherUser.user_id]
            );
        });



        test('Debe actualizar los campos permitidos sin modificar parent_task_id', async () => {
            const owner = await createUser();

            const parentTask = await createTask(owner.user_id);
            const anotherParentTask = await createTask(owner.user_id);

            const subTask = await createTask(owner.user_id, {
                parent_task_id: parentTask.task_id
            });

            const updatedTask = {
                name: 'Nombre actualizado',
                description: 'Descripción actualizada',
                status: 'inprogress',
                priority: 'high',
                visibility: 'public',

                // Intentamos cambiar la jerarquía.
                parent_task_id: anotherParentTask.task_id
            };

            const result = await taskRepository.update(
                subTask.task_id,
                updatedTask,
                owner.user_id
            );

            expect(result).not.toBeNull();

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE task_id = ?',
                [subTask.task_id]
            );

            expect(rows).toHaveLength(1);

            expect(rows[0].name).toBe('Nombre actualizado');
            expect(rows[0].description).toBe('Descripción actualizada');
            expect(rows[0].status).toBe('inprogress');
            expect(rows[0].priority).toBe('high');
            expect(rows[0].visibility).toBe('public');

            // La jerarquía original debe permanecer intacta.
            expect(rows[0].parent_task_id).toBe(parentTask.task_id);
        });


        test('Un usuario que no sea propietario no debe poder actualizar la tarea', async () => {
            const owner = await createUser();
            const unauthorizedUser = await createUser();

            const task = await createTask(owner.user_id);

            const updatedTask = {
                name: 'Intento de modificación',
                description: 'No debería actualizarse',
                status: 'inprogress',
                priority: 'critical',
                visibility: 'public'
            };

            const result = await taskRepository.update(
                task.task_id,
                updatedTask,
                unauthorizedUser.user_id
            );

            expect(result).toBeNull();

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE task_id = ?',
                [task.task_id]
            );

            expect(rows[0].name).toBe('Tarea de prueba');
            expect(rows[0].description).toBe('Descripción de prueba');
            expect(rows[0].status).toBe('pending');
            expect(rows[0].priority).toBe('medium');
            expect(rows[0].visibility).toBe('private');
        });

    });

    describe('delete', () => {

        test('Debe eliminar una tarea correctamente', async () => {

            const user = createTestUser('delete');

            await insertTestUser(user);

            const task = await taskRepository.create(
                createTestTask(
                    user.user_id,
                    'delete'
                )
            );

            const result =
                await taskRepository.delete(
                    task.task_id,
                    user.user_id
                );

            expect(result).toBe(true);

            const [rows] = await DBPool.query(
                'SELECT * FROM tasks WHERE task_id = ?',
                [task.task_id]
            );

            expect(rows).toHaveLength(0);

            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [user.user_id]
            );
        });


        test('debería devolver false si la tarea no pertenece al usuario', async () => {

            const owner = createTestUser('delete-owner');
            const otherUser = createTestUser('delete-other');

            await insertTestUser(owner);
            await insertTestUser(otherUser);

            const task = await taskRepository.create(
                createTestTask(
                    owner.user_id,
                    'delete-denied'
                )
            );

            const result =
                await taskRepository.delete(
                    task.task_id,
                    otherUser.user_id
                );

            expect(result).toBe(false);

            await taskRepository.delete(
                task.task_id,
                owner.user_id
            );

            await DBPool.query(
                'DELETE FROM users WHERE user_id IN (?, ?)',
                [owner.user_id, otherUser.user_id]
            );
        });

    });

    afterAll(async () => {
        await DBPool.end();
    });
});