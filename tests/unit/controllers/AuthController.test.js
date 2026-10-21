import { jest } from '@jest/globals';
import AuthController from '../../../src/controllers/AuthController.js';

describe('AuthController', () => {

    let controller;
    let mockAuthService;
    let mockPerfilService;
    let mockRequest; 
    let mockResponse;

    beforeEach(() => {

        mockAuthService = {
            getMe: jest.fn(),
            login: jest.fn()
        };
        mockPerfilService = {
            createProfile: jest.fn()
        };


        controller = new AuthController({
            AuthService: mockAuthService,
            ProfileService: mockPerfilService
        });
        
        mockRequest = { 
            body: {},
            user: {
                user_id: '123',
                role: 'user'
            }
        }; 
        mockResponse = { 
            cookie: jest.fn(),
            clearCookie: jest.fn(),
            status: jest.fn().mockReturnThis(), 
            json: jest.fn().mockReturnThis() 
        };
    });

    describe('createProfile', () => {

        test('Debe crear el perfil y devolver status 201 con el usuario creado', async () => {

            const user = { 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const newUser = '123'; 

            mockRequest.body = { user }; 
            mockPerfilService.createProfile.mockResolvedValue(newUser); 

            await controller.createProfile( mockRequest, mockResponse );

            expect(mockPerfilService.createProfile).toHaveBeenCalledTimes(1); 
            expect(mockPerfilService.createProfile).toHaveBeenCalledWith(user); 
            expect(mockResponse.status).toHaveBeenCalledTimes(1); 
            expect(mockResponse.status).toHaveBeenCalledWith(201); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Perfil creado.', 
                user: newUser 
            });

        });
        test('Debe devolver status 400 cuando crearPerfil lanza un error', async () => { 
            const user = { 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const error = new Error('Error al crear el perfil'); 
            mockRequest.body = { user }; 
            mockPerfilService.createProfile.mockRejectedValue(error); 
            
            await controller.createProfile( mockRequest, mockResponse ); 
            
            expect(mockPerfilService.createProfile).toHaveBeenCalledTimes(1); 
            expect(mockPerfilService.createProfile).toHaveBeenCalledWith(user); 
            expect(mockResponse.status).toHaveBeenCalledTimes(1); 
            expect(mockResponse.status).toHaveBeenCalledWith(400); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Error al crear el perfil' }
            ); 
        });
    });

    describe('getMe', () => {

        test('Debe devolver los datos del usuario cuando está autenticado', async () => { 

            const userData = { 
                user_id: '123', 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                phone: '600000000', 
                avatar_url: 'avatar.jpg', 
                role: 'user' 
            }; 
            
            mockAuthService.getMe.mockResolvedValue(userData); 
            
            await controller.getMe( mockRequest, mockResponse ); 
            
            expect(mockAuthService.getMe).toHaveBeenCalledTimes(1); 
            expect(mockAuthService.getMe) .toHaveBeenCalledWith('123'); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith({ 
                message: 'Usuario activo.', 
                user: userData
            }); 
        }); 
        test('Debe devolver 401 cuando el usuario no está autenticado', async () => { 
            mockRequest.user = null; 
            
            await controller.getMe( mockRequest, mockResponse ); 
            
            expect(mockAuthService.getMe).not.toHaveBeenCalled(); 
            expect(mockResponse.status).toHaveBeenCalledTimes(1); 
            expect(mockResponse.status).toHaveBeenCalledWith(401); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Usuario no autenticado' }
            ); 
        }); 
        test('Debe devolver 406 cuando authService.getMe lanza un error', async () => { 

            const error = new Error('Usuario no encontrado'); 
            
            mockAuthService.getMe.mockRejectedValue(error); 
            
            await controller.getMe( mockRequest, mockResponse ); 
            
            expect(mockAuthService.getMe).toHaveBeenCalledTimes(1); 
            expect(mockAuthService.getMe).toHaveBeenCalledWith('123'); 
            expect(mockResponse.status).toHaveBeenCalledTimes(1); 
            expect(mockResponse.status).toHaveBeenCalledWith(406); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Usuario no encontrado' }
            ); 
        });

    });

    describe('login', () => {
        
        test('Debe realizar login y crear una cookie de 1 hora cuando rememberMe es false', async () => { 
            const user = { 
                email: 'alex@test.com', 
                password: 'password123', 
                rememberMe: false 
            }; 
            const token = 'token-generado'; 
            
            mockRequest.body = { user }; 
            mockAuthService.login.mockResolvedValue(token); 

            await controller.login( mockRequest, mockResponse ); 

            expect(mockAuthService.login).toHaveBeenCalledTimes(1); 
            expect(mockAuthService.login).toHaveBeenCalledWith( user.email, user.password ); 
            expect(mockResponse.cookie).toHaveBeenCalledTimes(1); 
            expect(mockResponse.cookie).toHaveBeenCalledWith( 'access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 60 * 60 * 1000 } ); 
            expect(mockResponse.json).toHaveBeenCalledTimes(1); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { message: 'Login exitoso.', user: { email: user.email } }
            ); 
        }); 
        test('Debe crear una cookie de 30 días cuando rememberMe es true', async () => { 
            const user = { 
                email: 'alex@test.com', 
                password: 'password123', 
                rememberMe: true 
            }; 
            const token = 'token-generado'; 
            
            mockRequest.body = { user }; 
            mockAuthService.login.mockResolvedValue(token); 
            
            await controller.login( mockRequest, mockResponse ); 
            
            expect(mockAuthService.login).toHaveBeenCalledWith( user.email, user.password ); 
            expect(mockResponse.cookie).toHaveBeenCalledWith( 'access_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 }); 
            expect(mockResponse.json) .toHaveBeenCalledWith({ message: 'Login exitoso.', user: { email: user.email } }); 
        }); 
        test('Debe devolver 400 cuando no se proporciona email', async () => { 
            mockRequest.body = { 
                user: { 
                    password: 'password123' } 
                }; 
            await controller.login( mockRequest, mockResponse ); 
            expect(mockAuthService.login).not.toHaveBeenCalled(); 
            expect(mockResponse.status).toHaveBeenCalledWith(400); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Email y contraseña son requeridos' }
            ); 
        }); 
        test('Debe devolver 400 cuando no se proporciona contraseña', async () => { 
            mockRequest.body = { 
                user: { email: 'alex@test.com' } 
            }; 
               
            await controller.login( mockRequest, mockResponse ); 
            
            expect(mockAuthService.login).not.toHaveBeenCalled(); 
            expect(mockResponse.status).toHaveBeenCalledWith(400); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Email y contraseña son requeridos' }
            ); 
        }); 
        test('Debe devolver 401 cuando authService.login lanza un error', async () => { 
            const user = { 
                email: 'alex@test.com', 
                password: 'password123', 
                rememberMe: false 
            }; 
            const error = new Error('Credenciales incorrectas'); 
            
            mockRequest.body = { user }; 
            mockAuthService.login.mockRejectedValue(error); 
            
            await controller.login( mockRequest, mockResponse ); 
            
            expect(mockAuthService.login).toHaveBeenCalledTimes(1); 
            expect(mockAuthService.login).toHaveBeenCalledWith( user.email, user.password ); 
            expect(mockResponse.status).toHaveBeenCalledWith(401); 
            expect(mockResponse.json).toHaveBeenCalledWith(
                { error: 'Credenciales incorrectas' }
            ); 
        });
    });

    describe('logout', () => {
        test('Debe limpiar la cookie y devolver logout exitoso', async () => {

            const user = {email: 'alex@test.com'};

            mockRequest.user = user;

            await controller.logout(mockRequest, mockResponse);

            expect(mockResponse.clearCookie).toHaveBeenCalledTimes(1);
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Logout exitoso.',
                user: {
                    email: user.email
                }
            });
        });


        test('Debe devolver 400 cuando ocurre un error durante el logout', async () => {

            const user = {email: 'alex@test.com'};

            mockRequest.user = user;

            const error = new Error('Error al cerrar sesión');

            mockResponse.clearCookie.mockImplementation(() => {
                throw error;
            });

            await controller.logout(mockRequest, mockResponse);

            expect(mockResponse.clearCookie).toHaveBeenCalledTimes(1);
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token');
            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Error al cerrar sesión'
            });
        });
    });
});

