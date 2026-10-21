import { jest } from '@jest/globals';
import TaskRepository from '../../../src/repositories/TaskRepository.js';


describe('TaskRepository', () => {

    let repository;
    let mockDBPool;

    beforeEach(() => {

        mockDBPool = {
            query: jest.fn()
        };

        repository = new TaskRepository({
            DBPool: mockDBPool
        });

    });

    
    describe('create', () => {

        test('Debe crear una tarea y devolverla con su insertId', async () => {

            const newTask = {
                name: 'tarea mock nueva',
                description: 'descripción de la tarea mock nueva',
                status: null,
                priority: null,
                parent_task_id: null,
                created_by: '123',
                visibility: 'private'
            };

            mockDBPool.query.mockResolvedValue([
                {
                    insertId: 42
                }
            ]);

            const result = await repository.create(newTask);

            newTask.task_id = 42

            expect(result).toEqual(newTask);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO tasks'),
                [
                    newTask.name, 
                    newTask.description, 
                    newTask.status, 
                    newTask.priority, 
                    newTask.parent_task_id, 
                    newTask.created_by,
                    newTask.visibility
                ]
            );

        });
        test('Debe propagar el error si falla la creación', async () => {

            const newTask = {
                name: 'tarea mock nueva',
                description: 'descripción de la tarea mock nueva',
                status: null,
            };

            const error = new Error('Error de base de datos');

            mockDBPool.query.mockRejectedValue(error);

            await expect(
                repository.create(newTask)
            ).rejects.toThrow('Error de base de datos');

        });
    });


    describe('findParentTasksByUserID', () => {

        test('Debe devolver las tareas que no son subtareas', async () => {

            const tasks = [
                {
                    task_id: '1',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'private'
                },
                {
                    task_id: '2',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'private'
                }
            ];

            mockDBPool.query.mockResolvedValue([tasks]);

            const result = await repository.findParentTasksByUserID('123');

            expect(result).toEqual(tasks);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE parent_task_id is null and created_by = ?'),
                ['123']
            );
        });
        test('Debe devolver null si el usuario no existe o no tiene tareas', async () => {

            mockDBPool.query.mockResolvedValue([
                []
            ]);

            const result = await repository.findParentTasksByUserID('123');

            expect(result).toEqual([]);

        });
    });


    describe('findSubTasks', () => {

        test('Debe devolver las subtareas de una tarea', async () => {

            const tasks = [
                {
                    task_id: '1',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'private'
                },
                {
                    task_id: '2',
                    name: 'subtarea mock nueva',
                    description: 'descripción de la subtarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: '1',
                    created_by: '123',
                    visibility: 'private'
                }
            ];

            mockDBPool.query.mockResolvedValue([tasks[1]]);

            const result = await repository.findSubTasks('1');

            expect(result).toEqual(tasks[1]);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE parent_task_id = ?'),
                ['1']
            );
        });
        test('Debe devolver null si la tarea no existe o no tiene subtareas', async () => {

            mockDBPool.query.mockResolvedValue([
                []
            ]);

            const result = await repository.findSubTasks('2');

            expect(result).toEqual([]);

        });
    });


    describe('findPublicTasks', () => {

        test('Debe devolver las tareas públicas', async () => {

            const tasks = [
                {
                    task_id: '1',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'public'
                },
                {
                    task_id: '2',
                    name: 'subtarea mock nueva',
                    description: 'descripción de la subtarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: '1',
                    created_by: '123',
                    visibility: 'public'
                }
            ];

            mockDBPool.query.mockResolvedValue([tasks]);

            const result = await repository.findPublicTasks('123');

            expect(result).toEqual(tasks);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE visibility = \'public\''),
                ['123','123']
            );
        });
        test('Debe devolver null si no hay tareas públicas válidas', async () => {

            mockDBPool.query.mockResolvedValue([
                []
            ]);

            const result = await repository.findPublicTasks('123');

            expect(result).toEqual([]);

        });
    });


    describe('findTasksByCollaborating', () => {

        test('Debe devolver las tareas en las que se colabora', async () => {

            const tasks = [
                {
                    task_id: '1',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'public'
                },
                {
                    task_id: '2',
                    name: 'subtarea mock nueva',
                    description: 'descripción de la subtarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: '1',
                    created_by: '123',
                    visibility: 'public'
                }
            ];

            mockDBPool.query.mockResolvedValue([tasks]);

            const result = await repository.findTasksByCollaborating('234');

            expect(result).toEqual(tasks);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_tasks.user_id = ?'),
                ['234']
            );
        });
        test('Debe devolver null si no colabora en ninguna tarea', async () => {

            mockDBPool.query.mockResolvedValue([
                []
            ]);

            const result = await repository.findTasksByCollaborating('234');

            expect(result).toEqual([]);

        });
    });


    describe('findTasksByCollabRequest', () => {

        test('Debe devolver las tareas con una solicitud de colaboración pendiente', async () => {

            const tasks = [
                {
                    task_id: '1',
                    name: 'tarea mock nueva',
                    description: 'descripción de la tarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: null,
                    created_by: '123',
                    visibility: 'public'
                },
                {
                    task_id: '2',
                    name: 'subtarea mock nueva',
                    description: 'descripción de la subtarea mock nueva',
                    status: null,
                    priority: null,
                    parent_task_id: '1',
                    created_by: '123',
                    visibility: 'public'
                }
            ];

            mockDBPool.query.mockResolvedValue([tasks]);

            const result = await repository.findTasksByCollabRequest('234');

            expect(result).toEqual(tasks);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE requests_task.user_id = ?'),
                ['234']
            );
        });
        test('Debe devolver null si no hay ninguna solicitud de colaboración pendiente', async () => {

            mockDBPool.query.mockResolvedValue([
                []
            ]);

            const result = await repository.findTasksByCollabRequest('234');

            expect(result).toEqual([]);

        });
    });


    describe('findById', () => {

        test('Debe devolver la tarea cuando el usuario tiene permiso', async () => {

            const task = {
                task_id: '1',
                name: 'tarea mock nueva',
                description: 'descripción de la tarea mock nueva',
                status: null,
                priority: null,
                parent_task_id: null,
                created_by: '123',
                visibility: 'private'
            };

            mockDBPool.query
                .mockResolvedValueOnce([
                    [{ task_id: '1' }]
                ])

                .mockResolvedValueOnce([[task]]);

            const result = await repository.findById('1', '123');

            expect(result).toEqual(task);

            expect(mockDBPool.query).toHaveBeenCalledTimes(2);

            expect(mockDBPool.query).toHaveBeenNthCalledWith(
                1, expect.stringContaining('SELECT *'), ['1']
            );

            expect(mockDBPool.query).toHaveBeenNthCalledWith(
                2, expect.stringContaining('WHERE t.task_id = ?'),
                ['1', '123', '123', '123', '1']
            );

        });
        test('Debe lanzar error si la tarea no existe', async () => {

            mockDBPool.query.mockResolvedValueOnce([
                []
            ]);

            await expect(
                repository.findById('3', '123')
            ).rejects.toThrow('Tarea no encontrada');

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

        });
        test('Debe lanzar error si el usuario no tiene permiso', async () => {

            mockDBPool.query
                .mockResolvedValueOnce([
                    [{ task_id: '1' }]
                ])

                .mockResolvedValueOnce([
                    []
                ]);

            await expect(
                repository.findById('1', '234')
            ).rejects.toThrow(
                'No tienes permiso para acceder a esta tarea'
            );

            expect(mockDBPool.query).toHaveBeenCalledTimes(2);

        });
    });


    describe('findPriorities', () => {

        test('Debe devolver las prioridades disponibles', async () => {

            mockDBPool.query.mockResolvedValue([
                [
                    {
                        Field: 'priority',
                        Type: "enum('low','medium','high')"
                    }
                ]
            ]);

            const result = await repository.findPriorities();

            expect(result).toEqual([
                'low',
                'medium',
                'high'
            ]);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                "SHOW COLUMNS FROM tasks LIKE 'priority'"
            );
        });
        test('Debe devolver los estados disponibles', async () => {

            mockDBPool.query.mockResolvedValue([
                [
                    {
                        Field: 'status',
                        Type: "enum('pending','in_progress','completed')"
                    }
                ]
            ]);

            const result = await repository.findStatus();

            expect(result).toEqual([
                'pending',
                'in_progress',
                'completed'
            ]);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                "SHOW COLUMNS FROM tasks LIKE 'status'"
            );
        });
    });

    
    describe('update', () => {

        test('Debe devolver la tarea actualizada', async () => {

            const user_id = '123'; 
            const task_id = '1';
            const task = {
                name: 'tarea mock nueva',
                description: 'descripción de la tarea mock nueva',
                status: null,
                priority: 'alta',
                parent_task_id: null,
                created_by: '123',
                visibility: 'public'
            };

            mockDBPool.query.mockResolvedValue([
                {
                    affectedRows: 1
                }
            ]);

            const result = await repository.update(task_id, task, user_id);

            task.task_id = task_id;

            expect(result).toEqual(task);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE task_id = ? AND created_by = ?'),
                [
                    task.name, 
                    task.description, 
                    task.status, 
                    task.priority, 
                    task.parent_task_id, 
                    task.visibility, 
                    task.task_id, 
                    user_id 
                ]
            );
        });
        test('Debe devolver null si la tarea no se actualizada', async () => {

            const user_id = '123'; 
            const task_id = '1';
            const task = {
                name: 'tarea mock nueva',
                description: 'descripción de la tarea mock nueva',
                status: null,
                priority: 'alta',
                parent_task_id: null,
                created_by: '123',
                visibility: 'public'
            };

            mockDBPool.query.mockResolvedValue([
                {
                    affectedRows: 0
                }
            ]);

            const result = await repository.update(task_id, task, user_id);

            task.task_id = task_id;
            
            expect(result).toEqual(null);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE task_id = ? AND created_by = ?'),
                [
                    task.name, 
                    task.description, 
                    task.status, 
                    task.priority, 
                    task.parent_task_id, 
                    task.visibility, 
                    task.task_id, 
                    user_id 
                ]
            );
        });
    });

    
    describe('delete', () => {

        test('Debe devolver \'true\' si la tarea se elimina', async () => {

            const user_id = '123'; 
            const task_id = '1';

            mockDBPool.query.mockResolvedValue([
                {
                    affectedRows: 1
                }
            ]);

            const result = await repository.delete(task_id, user_id);

            expect(result).toEqual(true);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM tasks WHERE task_id = ? and created_by = ?'),
                [
                    task_id, 
                    user_id 
                ]
            );
        });
        test('Debe devolver \'false\' si la tarea no se elimina', async () => {

            const user_id = '123'; 
            const task_id = '1';

            mockDBPool.query.mockResolvedValue([
                {
                    affectedRows: 0
                }
            ]);

            const result = await repository.delete(task_id, user_id);

            expect(result).toEqual(false);

            expect(mockDBPool.query).toHaveBeenCalledTimes(1);

            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM tasks WHERE task_id = ? and created_by = ?'),
                [
                    task_id, 
                    user_id 
                ]
            );
        });
    });
});