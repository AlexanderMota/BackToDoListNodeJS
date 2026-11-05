import { jest } from '@jest/globals';
import TaskController from '../../../src/controllers/TaskController.js';

describe('TaskController', () => {
    let controller;
    let mockTaskService;
    let mockRequest;
    let mockResponse;

    const mockUser = {
        user_id: 'user-123',
        role: 'user'
    };

    const mockTask = {
        task_id: 1,
        name: 'Tarea de prueba',
        description: 'Descripción de prueba',
        status: 'pending',
        priority: 'medium',
        parent_task_id: null,
        visibility: 'private',
        created_by: mockUser.user_id
    };

    const mockTasks = [mockTask];

    beforeEach(() => {
        mockTaskService = {
            createTarea: jest.fn(),
            getParentTasksByUserID: jest.fn(),
            getSubTasks: jest.fn(),
            getTasksByCollaborating: jest.fn(),
            getTasksByCollabRequest: jest.fn(),
            getPublicTasks: jest.fn(),
            getTareaById: jest.fn(),
            getPriorities: jest.fn(),
            getStatus: jest.fn(),
            updateTarea: jest.fn(),
            deleteTarea: jest.fn()
        };

        controller = new TaskController({
            TaskService: mockTaskService
        });

        mockRequest = {
            body: { task: { ...mockTask } },
            params: { id: '1' },
            user: { ...mockUser }
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('createTarea', () => {
        test('Debe crear una tarea y devolver status 201', async () => {
            const task = {
                name: 'Nueva tarea',
                description: 'Descripción',
                parent_task_id: null,
                priority: 'medium',
                status: "pending",
                visibility: "private"
            };

            const createdTask = { ...task, task_id: 1 };
            mockRequest.body = { task };

            mockTaskService.createTarea.mockResolvedValue(createdTask);

            await controller.createTarea(mockRequest, mockResponse);

            expect(mockTaskService.createTarea).toHaveBeenCalledTimes(1);
            expect(mockTaskService.createTarea).toHaveBeenCalledWith({
                ...task,
                created_by: mockUser.user_id
            });
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tarea creada exitosamente.',
                task: createdTask
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.createTarea(mockRequest, mockResponse);

            expect(mockTaskService.createTarea).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.createTarea.mockRejectedValue(
                new Error('Error al crear la tarea')
            );

            await controller.createTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getParentTasks', () => {
        test('Debe devolver las tareas padre del usuario', async () => {
            mockTaskService.getParentTasksByUserID.mockResolvedValue(mockTasks);

            await controller.getParentTasks(mockRequest, mockResponse);

            expect(mockTaskService.getParentTasksByUserID)
                .toHaveBeenCalledWith(mockUser.user_id);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tareas encontradas.',
                tasks: mockTasks
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getParentTasks(mockRequest, mockResponse);

            expect(mockTaskService.getParentTasksByUserID).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getParentTasksByUserID.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getParentTasks(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getSubTasks', () => {
        test('Debe devolver las subtareas de una tarea padre', async () => {
            mockTaskService.getSubTasks.mockResolvedValue(mockTasks);

            await controller.getSubTasks(mockRequest, mockResponse);

            expect(mockTaskService.getSubTasks).toHaveBeenCalledWith('1', "user-123");
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Subtareas encontradas.',
                tasks: mockTasks
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getSubTasks(mockRequest, mockResponse);

            expect(mockTaskService.getSubTasks).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getSubTasks.mockRejectedValue(
                new Error('Error al obtener subtareas')
            );

            await controller.getSubTasks(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getTasksByCollaborating', () => {
        test('Debe devolver las tareas en las que colabora el usuario', async () => {
            mockTaskService.getTasksByCollaborating.mockResolvedValue(mockTasks);

            await controller.getTasksByCollaborating(mockRequest, mockResponse);

            expect(mockTaskService.getTasksByCollaborating)
                .toHaveBeenCalledWith(mockUser.user_id);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tareas encontradas.',
                tasks: mockTasks
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getTasksByCollaborating(mockRequest, mockResponse);

            expect(mockTaskService.getTasksByCollaborating).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getTasksByCollaborating.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getTasksByCollaborating(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getTasksByCollabRequest', () => {
        test('Debe devolver las tareas relacionadas con solicitudes de colaboración', async () => {
            mockTaskService.getTasksByCollabRequest.mockResolvedValue(mockTasks);

            await controller.getTasksByCollabRequest(mockRequest, mockResponse);

            expect(mockTaskService.getTasksByCollabRequest)
                .toHaveBeenCalledWith(mockUser.user_id);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tareas encontradas.',
                tasks: mockTasks
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getTasksByCollabRequest(mockRequest, mockResponse);

            expect(mockTaskService.getTasksByCollabRequest).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getTasksByCollabRequest.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getTasksByCollabRequest(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getPublicTasks', () => {
        test('Debe devolver las tareas públicas', async () => {
            mockTaskService.getPublicTasks.mockResolvedValue(mockTasks);

            await controller.getPublicTasks(mockRequest, mockResponse);

            expect(mockTaskService.getPublicTasks)
                .toHaveBeenCalledWith(mockUser.user_id);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tareas encontradas.',
                tasks: mockTasks
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getPublicTasks(mockRequest, mockResponse);

            expect(mockTaskService.getPublicTasks).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getPublicTasks.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getPublicTasks(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getTareaById', () => {
        test('Debe devolver una tarea existente', async () => {
            mockTaskService.getTareaById.mockResolvedValue(mockTask);

            await controller.getTareaById(mockRequest, mockResponse);

            expect(mockTaskService.getTareaById)
                .toHaveBeenCalledWith('1', mockUser.user_id);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tarea encontrada',
                task: mockTask
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getTareaById(mockRequest, mockResponse);

            expect(mockTaskService.getTareaById).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 404 si el servicio no encuentra la tarea', async () => {
            mockTaskService.getTareaById.mockResolvedValue(null);

            await controller.getTareaById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tarea no encontrada'
            });
        });

        test('Debe devolver 500 si el servicio lanza "Tarea no encontrada"', async () => {
            mockTaskService.getTareaById.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getTareaById(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });

        test('Debe devolver 500 si ocurre un error inesperado', async () => {
            /*const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {});

            try {*/
                mockTaskService.getTareaById.mockRejectedValue(
                    new Error('Error de base de datos')
                );

                await controller.getTareaById(mockRequest, mockResponse);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: 'Error interno del servidor'
                });
                /*expect(consoleErrorSpy).toHaveBeenCalled();
            } finally {
                consoleErrorSpy.mockRestore();
            }*/
        });
    });

    describe('getPriorities', () => {
        test('Debe devolver las prioridades disponibles', async () => {
            const priorities = ['low', 'medium', 'high'];
            mockTaskService.getPriorities.mockResolvedValue(priorities);

            await controller.getPriorities(mockRequest, mockResponse);

            expect(mockTaskService.getPriorities).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Prioridades encontradas.',
                priorities
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getPriorities(mockRequest, mockResponse);

            expect(mockTaskService.getPriorities).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getPriorities.mockRejectedValue(
                new Error('Error al obtener prioridades')
            );

            await controller.getPriorities(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('getStatus', () => {
        test('Debe devolver los estados disponibles', async () => {
            const statuses = ['pending', 'inprogress', 'completed'];
            mockTaskService.getStatus.mockResolvedValue(statuses);

            await controller.getStatus(mockRequest, mockResponse);

            expect(mockTaskService.getStatus).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Status encontrados.',
                status: statuses
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.getStatus(mockRequest, mockResponse);

            expect(mockTaskService.getStatus).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.getStatus.mockRejectedValue(
                new Error('Error interno del servidor')
            );

            await controller.getStatus(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('updateTarea', () => {
        test('Debe actualizar una tarea existente', async () => {
            const updatedTask = {
                ...mockTask,
                name: 'Tarea actualizada'
            };

            mockTaskService.updateTarea.mockResolvedValue(updatedTask);

            await controller.updateTarea(mockRequest, mockResponse);

            expect(mockTaskService.updateTarea).toHaveBeenCalledWith(
                '1',{
                    "description":mockRequest.body.task.description,
                    "name": mockRequest.body.task.name,
                    "priority": mockRequest.body.task.priority,
                    "status": mockRequest.body.task.status,
                    "visibility": mockRequest.body.task.visibility
                },
                mockUser.user_id
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tarea actualizada exitosamente.',
                task: updatedTask
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.updateTarea(mockRequest, mockResponse);

            expect(mockTaskService.updateTarea).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 404 si la tarea no existe o no pertenece al usuario', async () => {
            mockTaskService.updateTarea.mockResolvedValue(null);

            await controller.updateTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tarea no encontrada o propietario incorrecto'
            });
        });

        test('Debe devolver 500 si el servicio lanza el error esperado', async () => {
            mockTaskService.updateTarea.mockRejectedValue(
                new Error('Tarea no encontrada o propietario incorrecto')
            );

            await controller.updateTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });

        test('Debe devolver 500 si ocurre un error inesperado', async () => {
            mockTaskService.updateTarea.mockRejectedValue(
                new Error('Error de base de datos')
            );

            await controller.updateTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });

    describe('deleteTarea', () => {
        test('Debe eliminar una tarea existente', async () => {
            mockTaskService.deleteTarea.mockResolvedValue(mockTask);

            await controller.deleteTarea(mockRequest, mockResponse);

            expect(mockTaskService.deleteTarea).toHaveBeenCalledWith(
                '1',
                mockUser.user_id
            );
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Tarea eliminada exitosamente.',
                task: mockTask
            });
        });

        test('Debe devolver 401 si no hay usuario autenticado', async () => {
            mockRequest.user = null;

            await controller.deleteTarea(mockRequest, mockResponse);

            expect(mockTaskService.deleteTarea).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });

        test('Debe devolver 404 si la tarea no existe o no pertenece al usuario', async () => {
            mockTaskService.deleteTarea.mockResolvedValue(null);

            await controller.deleteTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tarea no encontrada o propietario incorrecto'
            });
        });

        test('Debe devolver 500 si el servicio lanza un error', async () => {
            mockTaskService.deleteTarea.mockRejectedValue(
                new Error('Error al eliminar la tarea')
            );

            await controller.deleteTarea(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error interno del servidor'
            });
        });
    });
});