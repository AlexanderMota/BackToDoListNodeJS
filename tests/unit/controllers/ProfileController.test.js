import {jest} from '@jest/globals';
import { ProfileController } from '../../../src/controllers/index.js';

describe('ProfileController', () => {    
    
    let controller;
    let mockPerfilService;
    let mockRequest; 
    let mockResponse;
    
    beforeEach(() => {

        mockPerfilService = {
            searchUsers: jest.fn(),
            updateAvatar: jest.fn(),
            getUserById: jest.fn(),
            actualizarPerfil: jest.fn(),
            actualizarPassword: jest.fn(),
            deleteAvatar: jest.fn(),
            deleteProfile: jest.fn()
        };


        controller = new ProfileController({
            ProfileService: mockPerfilService
        });
        
        mockRequest = { 
            user: {
                user_id: '123',
                role: 'user'
            },
            body: {
            }, query: {}, params: {}, file: { filename: 'avatar.jpg' }
        }; 
        mockResponse = { 
            //cookie: jest.fn(),
            //clearCookie: jest.fn(),
            status: jest.fn().mockReturnThis(), 
            json: jest.fn().mockReturnThis() 
        };
    });

    describe('searchUsers', () => {   
        test('Debe devolver los perfiles que coincidan con la búsqueda', async () => {

            const userData = [{ 
                user_id: '124', 
                name: 'Adrian', 
                lastname: 'Mota', 
                username: 'Adri', 
                email: 'Adrian@test.com', 
                phone: '600000000', 
                avatar_url: 'avatar1.jpg', 
                role: 'admin' 
            },{ 
                user_id: '125', 
                name: 'Pedro', 
                lastname: 'Mota', 
                username: 'Pedri', 
                email: 'Pedri@test.com', 
                phone: '600000001', 
                avatar_url: 'avatar2.jpg', 
                role: 'user' 
            },{ 
                user_id: '126', 
                name: 'Juan', 
                lastname: 'Mota', 
                username: 'Juanan', 
                email: 'Juanan@test.com', 
                phone: '600000002', 
                avatar_url: 'avatar3.jpg', 
                role: 'user' 
            }]; 
            
            mockPerfilService.searchUsers.mockResolvedValue(userData); 
            mockRequest.query.task_id = '1';
            mockRequest.params.query = 'mot';
            await controller.searchUsers( mockRequest,mockResponse ); 
            
            expect(mockPerfilService.searchUsers).toHaveBeenCalledTimes(1); 
            expect(mockPerfilService.searchUsers).toHaveBeenCalledWith(
                mockRequest.params.query, 
                mockRequest.user.user_id, 
                mockRequest.query.task_id); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: `Perfiles encontrados (${userData.length})`, 
                users: userData
            });
        });
        test('Debe devolver [] cuando no encuentra coincidencias', async () => {
            
            mockPerfilService.searchUsers.mockResolvedValue([]); 
            mockRequest.query.task_id = '1';
            mockRequest.params.query = 'mot';
            await controller.searchUsers( mockRequest,mockResponse ); 
            
            expect(mockPerfilService.searchUsers).toHaveBeenCalledTimes(1); 
            expect(mockPerfilService.searchUsers).toHaveBeenCalledWith(
                mockRequest.params.query, 
                mockRequest.user.user_id, 
                mockRequest.query.task_id); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: `Perfiles encontrados (0)`, 
                users: []
            });
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            mockRequest.user = null; // Simula que no hay usuario autenticado
            await controller.searchUsers(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('subirFotoDePerfil', () => {  
        test('Debe recibir y guardar la foto de perfil y devolver confirmación', async () => {
            
            mockPerfilService.updateAvatar.mockResolvedValue(true); 
            /*mockRequest.query.task_id = '1';
            mockRequest.params.query = 'mot';*/
            await controller.subirFotoDePerfil( mockRequest,mockResponse ); 
            
            expect(mockPerfilService.updateAvatar).toHaveBeenCalledTimes(1); 
            expect(mockPerfilService.updateAvatar).toHaveBeenCalledWith(
                mockRequest.user.user_id, 
                mockRequest.file.filename
            );
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Avatar actualizado",
                user: {
                    avatar_url: mockRequest.file.filename
                }
            });
        }); 
        test('Debe devolver 401 si no se puede actualizar el avatar', async () => {
            mockPerfilService.updateAvatar.mockResolvedValue(false); 
            await controller.subirFotoDePerfil(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error al actualizar el avatar'
            });
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            mockRequest.user = null; // Simula que no hay usuario autenticado
            await controller.subirFotoDePerfil(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('verPerfil', () => {   
        test('Debe devolver 200 y el perfil del usuario', async () => {
            const perfil = { 
                user_id: '124', 
                name: 'Adrian', 
                lastname: 'Mota', 
                username: 'Adri', 
                email: 'Adrian@test.com', 
                phone: '600000000', 
                avatar_url: 'avatar1.jpg', 
                role: 'admin' 
            };

            mockPerfilService.getUserById.mockResolvedValue(perfil); 
            
            await controller.verPerfil(mockRequest, mockResponse);
            
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Perfil encontrado', user: perfil
            });
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            mockRequest.user = null; // Simula que no hay usuario autenticado
            await controller.verPerfil(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('actualizarPerfil', () => {   
        test('Debe actualizar el perfil del usuario y devolver el perfil actualizado', async () => {

            const newPerfil = { 
                user_id: '123', 
                name: 'JuanNew', 
                lastname: 'MotaNew', 
                username: 'Juananew', 
                email: 'Juanan@test.com', 
                phone: '600000002', 
                avatar_url: 'Newavatar3.jpg', 
                role: 'user' 
            };
            mockPerfilService.actualizarPerfil.mockResolvedValue(newPerfil); 
            
            mockRequest.body.perfil = newPerfil;
            
            await controller.actualizarPerfil(mockRequest, mockResponse);

            expect(mockPerfilService.actualizarPerfil).toHaveBeenCalledTimes(1);
            expect(mockPerfilService.actualizarPerfil).toHaveBeenCalledWith(mockRequest.user.user_id, newPerfil);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Perfil actualizado', 
                user: newPerfil
            });
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            
            mockRequest.user = null; // Simula que no hay usuario autenticado
            
            await controller.actualizarPerfil(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('actualizarPassword', () => {   
        test('Debe actualizar la contraseña y devolver confirmación', async () => {
            
            mockRequest.body.password = {
                newPassword: 'newPassword123', 
                currentPassword: 'currentPassword123'
            };

            mockPerfilService.actualizarPassword.mockResolvedValue(true);
            
            await controller.actualizarPassword(mockRequest, mockResponse);
            
            expect(mockPerfilService.actualizarPassword).toHaveBeenCalledWith(
                mockRequest.user.user_id, 
                mockRequest.body.password.currentPassword, 
                mockRequest.body.password.newPassword
            );
            expect(mockPerfilService.actualizarPassword).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Perfil actualizado.', user: mockRequest.user
            });
        });
        test('Debe devolver 401 si la contraseña no se puede actualizar', async () => {
            
            mockRequest.body.password = {
                newPassword: 'newPassword123', 
                currentPassword: 'currentPassword123'
            };

            mockPerfilService.actualizarPassword.mockResolvedValue(false);
            
            await controller.actualizarPassword(mockRequest, mockResponse);
            
            expect(mockPerfilService.actualizarPassword).toHaveBeenCalledWith(
                mockRequest.user.user_id,
                mockRequest.body.password.currentPassword, 
                mockRequest.body.password.newPassword
            );
            expect(mockPerfilService.actualizarPassword).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tuvimos un problema al intentar actualizar la contraseña. Verifica que la contraseña actual sea correcta'
            });
            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            mockRequest.user = null; // Simula que no hay usuario autenticado
            await controller.actualizarPassword(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('deleteFotoDePerfil', () => {   
        test('Debe devolver un response si el avatar se elimina correctamente', async () => {
            
            mockPerfilService.deleteAvatar.mockResolvedValue(true);
            
            await controller.deleteFotoDePerfil(mockRequest, mockResponse);
            
            expect(mockPerfilService.deleteAvatar).toHaveBeenCalledTimes(1);
            expect(mockPerfilService.deleteAvatar).toHaveBeenCalledWith(mockRequest.user.user_id);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Perfil actualizado.', 
                user: {avatar_url: null}
            });
            
        });
        test('Debe devolver 401 si se produce algún error eliminando la foto', async () => {
            
            mockPerfilService.deleteAvatar.mockResolvedValue(false);

            await controller.deleteFotoDePerfil(mockRequest, mockResponse);

            expect(mockPerfilService.deleteAvatar).toHaveBeenCalledTimes(1);
            expect(mockPerfilService.deleteAvatar).toHaveBeenCalledWith(mockRequest.user.user_id);
            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tuvimos un problema al intentar eliminar la foto de perfil'
            });
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            
            mockRequest.user = null; 

            await controller.deleteFotoDePerfil(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });

    describe('deleteProfile', () => {   

        test('Debe devolver un response si el perfil se elimina correctamente', async () => {
            
            mockPerfilService.deleteProfile.mockResolvedValue(true);
            
            await controller.deleteProfile(mockRequest, mockResponse);
            
            expect(mockPerfilService.deleteProfile).toHaveBeenCalledTimes(1);
            expect(mockPerfilService.deleteProfile).toHaveBeenCalledWith(mockRequest.user.user_id);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Perfil eliminado.', 
                user: {}
            });
            
        });
        test('Debe devolver 401 si se produce algún error eliminando el perfil', async () => {
            
            mockPerfilService.deleteProfile.mockResolvedValue(false);
            
            await controller.deleteProfile(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Tuvimos un problema al intentar eliminar el perfil'
            });
        });
        test('Debe devolver 400 si el usuario no está autenticado', async () => {
            
            mockRequest.user = null; 
            
            await controller.deleteProfile(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Usuario no autenticado'
            });
        });
    });
});