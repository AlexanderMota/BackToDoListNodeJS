import { jest } from '@jest/globals';

const { default: TaskService } = await import('../../../src/services/TaskService');

describe('TaskService', () => {

    let service;
    let mockTareasRepository;


    beforeEach(() => {

        mockTareasRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findParentTasksByUserID: jest.fn(),
            findSubTasks: jest.fn(),
            findTasksByCollaborating: jest.fn(),
            findTasksByCollabRequest: jest.fn(),
            findPublicTasks: jest.fn(),
            findPriorities: jest.fn(),
            findStatus: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };


        service = new TaskService({
            TaskRepository: mockTareasRepository
        });

    });


    describe('createTarea', () => {

        test('Debe crear una tarea y devolverla', async () => {
            const task = {
                title: 'Nueva tarea',
                description: 'Descripción de prueba',
                user_id: 1,
            };

            const createdTask = {
                id: 10,
                ...task,
            };

            mockTareasRepository.create.mockResolvedValue(createdTask);

            const result = await service.createTarea(task);

            expect(mockTareasRepository.create).toHaveBeenCalledWith(task);
            expect(mockTareasRepository.create).toHaveBeenCalledTimes(1);
            expect(result).toEqual(createdTask);
        });

        test('Debe propagar el error del repositorio', async () => {
            const error = new Error('Error al crear la tarea');

            mockTareasRepository.create.mockRejectedValue(error);

            await expect(
                service.createTarea({ title: 'Tarea' })
            ).rejects.toThrow('Error al crear la tarea');
        });

    });
    describe('getTareaById', () => {

        test('Debe devolver una tarea por su ID y usuario', async () => {
            const task = {
                id: 10,
                title: 'Mi tarea',
                user_id: 1,
            };

            mockTareasRepository.findById.mockResolvedValue(task);

            const result = await service.getTareaById(10, 1);

            expect(mockTareasRepository.findById).toHaveBeenCalledWith(10, 1);
            expect(mockTareasRepository.findById).toHaveBeenCalledTimes(1);
            expect(result).toEqual(task);
        });

        test('Debe devolver null si el repositorio no encuentra la tarea', async () => {
            mockTareasRepository.findById.mockResolvedValue(null);

            const result = await service.getTareaById(999, 1);

            expect(mockTareasRepository.findById).toHaveBeenCalledWith(999, 1);
            expect(result).toBeNull();
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findById.mockRejectedValue(
                new Error('Error al buscar tarea')
            );

            await expect(
                service.getTareaById(10, 1)
            ).rejects.toThrow('Error al buscar tarea');
        });

    });
    describe('getParentTasksByUserID', () => {
        test('Debe devolver las tareas padre del usuario', async () => {
            const tasks = [
                { id: 1, title: 'Tarea 1', user_id: 1 },
                { id: 2, title: 'Tarea 2', user_id: 1 },
            ];

            mockTareasRepository.findParentTasksByUserID.mockResolvedValue(tasks);

            const result = await service.getParentTasksByUserID(1);

            expect(
                mockTareasRepository.findParentTasksByUserID
            ).toHaveBeenCalledWith(1);

            expect(
                mockTareasRepository.findParentTasksByUserID
            ).toHaveBeenCalledTimes(1);

            expect(result).toEqual(tasks);
        });

        test('Debe devolver un array vacío si no existen tareas', async () => {
            mockTareasRepository.findParentTasksByUserID.mockResolvedValue([]);

            const result = await service.getParentTasksByUserID(1);

            expect(result).toEqual([]);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findParentTasksByUserID.mockRejectedValue(
                new Error('Error al obtener tareas padre')
            );

            await expect(
                service.getParentTasksByUserID(1)
            ).rejects.toThrow('Error al obtener tareas padre');
        });
    });
    describe('getSubTasks', () => {
        test('Debe devolver las subtareas de una tarea padre', async () => {
            const subtasks = [
                { id: 2, title: 'Subtarea 1', parent_task_id: 1 },
                { id: 3, title: 'Subtarea 2', parent_task_id: 1 },
            ];

            mockTareasRepository.findSubTasks.mockResolvedValue(subtasks);

            const result = await service.getSubTasks(1);

            expect(mockTareasRepository.findSubTasks).toHaveBeenCalledWith(1);
            expect(mockTareasRepository.findSubTasks).toHaveBeenCalledTimes(1);
            expect(result).toEqual(subtasks);
        });

        test('Debe devolver un array vacío si no existen subtareas', async () => {
            mockTareasRepository.findSubTasks.mockResolvedValue([]);

            const result = await service.getSubTasks(999);

            expect(result).toEqual([]);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findSubTasks.mockRejectedValue(
                new Error('Error al obtener subtareas')
            );

            await expect(
                service.getSubTasks(1)
            ).rejects.toThrow('Error al obtener subtareas');
        });
    });
    describe('getTasksByCollaborating', () => {
        test('Debe devolver las tareas en las que colabora el usuario', async () => {
            const tasks = [
                { id: 1, title: 'Tarea colaborativa' },
                { id: 2, title: 'Otra tarea' },
            ];

            mockTareasRepository.findTasksByCollaborating.mockResolvedValue(tasks);

            const result = await service.getTasksByCollaborating(5);

            expect(
                mockTareasRepository.findTasksByCollaborating
            ).toHaveBeenCalledWith(5);

            expect(result).toEqual(tasks);
        });

        test('Debe devolver un array vacío si no hay tareas colaborativas', async () => {
            mockTareasRepository.findTasksByCollaborating.mockResolvedValue([]);

            const result = await service.getTasksByCollaborating(5);

            expect(result).toEqual([]);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findTasksByCollaborating.mockRejectedValue(
                new Error('Error al obtener tareas colaborativas')
            );

            await expect(
                service.getTasksByCollaborating(5)
            ).rejects.toThrow('Error al obtener tareas colaborativas');
        });
    });
    describe('getTasksByCollabRequest', () => {
        test('Debe devolver las tareas con solicitudes de colaboración', async () => {
            const tasks = [
                { id: 1, title: 'Tarea con solicitud' },
            ];

            mockTareasRepository.findTasksByCollabRequest.mockResolvedValue(tasks);

            const result = await service.getTasksByCollabRequest(5);

            expect(
                mockTareasRepository.findTasksByCollabRequest
            ).toHaveBeenCalledWith(5);

            expect(result).toEqual(tasks);
        });

        test('Debe devolver un array vacío si no hay solicitudes', async () => {
            mockTareasRepository.findTasksByCollabRequest.mockResolvedValue([]);

            const result = await service.getTasksByCollabRequest(5);

            expect(result).toEqual([]);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findTasksByCollabRequest.mockRejectedValue(
                new Error('Error al obtener solicitudes')
            );

            await expect(
                service.getTasksByCollabRequest(5)
            ).rejects.toThrow('Error al obtener solicitudes');
        });
    });
    describe('getPublicTasks', () => {
        test('Debe devolver las tareas públicas excluyendo las del usuario', async () => {
            const tasks = [
                { id: 1, title: 'Tarea pública', user_id: 2 },
                { id: 2, title: 'Otra tarea pública', user_id: 3 },
            ];

            mockTareasRepository.findPublicTasks.mockResolvedValue(tasks);

            const result = await service.getPublicTasks(1);

            expect(
                mockTareasRepository.findPublicTasks
            ).toHaveBeenCalledWith(1);

            expect(result).toEqual(tasks);
        });

        test('Debe devolver un array vacío si no existen tareas públicas', async () => {
            mockTareasRepository.findPublicTasks.mockResolvedValue([]);

            const result = await service.getPublicTasks(1);

            expect(result).toEqual([]);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findPublicTasks.mockRejectedValue(
                new Error('Error al obtener tareas públicas')
            );

            await expect(
                service.getPublicTasks(1)
            ).rejects.toThrow('Error al obtener tareas públicas');
        });
    });
    describe('getPriorities', () => {
        test('Debe devolver las prioridades', async () => {
            const priorities = [
                { id: 1, name: 'Baja' },
                { id: 2, name: 'Media' },
                { id: 3, name: 'Alta' },
            ];

            mockTareasRepository.findPriorities.mockResolvedValue(priorities);

            const result = await service.getPriorities();

            expect(mockTareasRepository.findPriorities).toHaveBeenCalledTimes(1);
            expect(mockTareasRepository.findPriorities).toHaveBeenCalledWith();
            expect(result).toEqual(priorities);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findPriorities.mockRejectedValue(
                new Error('Error al obtener prioridades')
            );

            await expect(
                service.getPriorities()
            ).rejects.toThrow('Error al obtener prioridades');
        });
    });
    describe('getStatus', () => {
        test('Debe devolver los estados de las tareas', async () => {
            const statuses = [
                { id: 1, name: 'Pendiente' },
                { id: 2, name: 'En progreso' },
                { id: 3, name: 'Completada' },
            ];

            mockTareasRepository.findStatus.mockResolvedValue(statuses);

            const result = await service.getStatus();

            expect(mockTareasRepository.findStatus).toHaveBeenCalledTimes(1);
            expect(mockTareasRepository.findStatus).toHaveBeenCalledWith();
            expect(result).toEqual(statuses);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.findStatus.mockRejectedValue(
                new Error('Error al obtener estados')
            );

            await expect(
                service.getStatus()
            ).rejects.toThrow('Error al obtener estados');
        });
    });
    describe('updateTarea', () => {
        test('Debe actualizar una tarea y devolver el resultado', async () => {
            const tarea = {
                title: 'Tarea actualizada',
                description: 'Nueva descripción',
                priority_id: 2,
            };

            const updatedTask = {
                id: 10,
                ...tarea,
                user_id: 1,
            };

            mockTareasRepository.update.mockResolvedValue(updatedTask);

            const result = await service.updateTarea(
                10,
                tarea,
                1
            );

            expect(mockTareasRepository.update).toHaveBeenCalledWith(
                10,
                tarea,
                1
            );

            expect(mockTareasRepository.update).toHaveBeenCalledTimes(1);
            expect(result).toEqual(updatedTask);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.update.mockRejectedValue(
                new Error('Error al actualizar tarea')
            );

            await expect(
                service.updateTarea(
                10,
                { title: 'Actualizada' },
                1
                )
            ).rejects.toThrow('Error al actualizar tarea');
        });
    });
    describe('deleteTarea', () => {
        test('Debe eliminar una tarea y devolver el resultado', async () => {
            const response = {
                affectedRows: 1,
            };

            mockTareasRepository.delete.mockResolvedValue(response);

            const result = await service.deleteTarea(10, 1);

            expect(mockTareasRepository.delete).toHaveBeenCalledWith(10, 1);
            expect(mockTareasRepository.delete).toHaveBeenCalledTimes(1);
            expect(result).toEqual(response);
        });

        test('Debe propagar el error del repositorio', async () => {
            mockTareasRepository.delete.mockRejectedValue(
                new Error('Error al eliminar tarea')
            );

            await expect(
                service.deleteTarea(10, 1)
            ).rejects.toThrow('Error al eliminar tarea');
        });
    });
});

