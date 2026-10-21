import { jest, test } from '@jest/globals'; 

const mockBcryptHash = jest.fn(); 
const mockBcryptCompare = jest.fn();
const mockUnlink = jest.fn();

jest.unstable_mockModule('bcrypt', () => ({ 
    default: { 
        hash: mockBcryptHash,
        compare: mockBcryptCompare
     } 
})); 
jest.unstable_mockModule('fs/promises', () => ({ 
    default: { 
        unlink: mockUnlink 
    } 
}));

const { default: ProfileService } = await import(
    '../../../src/services/ProfileService.js'
); 

describe('ProfileService', () => { 
    
    let service; 
    let mockUserRepository; 
    
    beforeEach(() => { 
        
        mockUserRepository = { 
            register: jest.fn(), 
            findById: jest.fn(), 
            searchUsers: jest.fn(),
            updateAvatar: jest.fn(),
            updateProfile: jest.fn(),
            updatePassword: jest.fn(),
            delete: jest.fn()
        }; 
        
        service = new ProfileService({ 
            UserRepository: mockUserRepository 
        }); 
        
        jest.clearAllMocks(); 
    }); 
    
    describe('crearPerfil', () => { 
        
        test('Debe generar un user_id, hashear la contraseña y registrar el usuario', async () => { 
            
            const user = { 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const hashedPassword = 'password_hasheada'; 
            
            mockBcryptHash.mockResolvedValue(hashedPassword); 
            mockUserRepository.register.mockResolvedValue(user); 
            
            const result = await service.createProfile(user); 
            
            expect(mockBcryptHash).toHaveBeenCalledTimes(1); 
            expect(mockBcryptHash).toHaveBeenCalledWith('contraseña123', 10); 
            expect(mockUserRepository.register).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.register).toHaveBeenCalledWith( 
                expect.objectContaining({ 
                    name: 'Alexander', 
                    lastname: 'Mota', 
                    username: 'alex', 
                    email: 'alex@test.com', 
                    password: hashedPassword 
                }) 
            ); 
            
            const registeredUser = mockUserRepository.register.mock.calls[0][0]; 
            
            expect(registeredUser.user_id).toBeDefined(); 
            expect(registeredUser.user_id).not.toBe(''); 
            expect(result).toBe(user); 
        
        }); 
            
        test('Debe utilizar la contraseña hasheada antes de registrar el usuario', async () => { 
            const user = { 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            
            mockBcryptHash.mockResolvedValue('hash_generado'); 
            
            mockUserRepository.register.mockResolvedValue(42); 
            
            await service.createProfile(user); 
            
            expect(mockUserRepository.register).toHaveBeenCalledWith( 
                expect.objectContaining({ 
                    password: 'hash_generado' 
                }) 
            ); 
        }); 
    }); 
    
    describe('getUserById', () => { 
        test('Debe devolver un usuario \'seguro\' especificado', async () => {
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const { password, ...userSafe } = user;

            mockUserRepository.findById.mockResolvedValue(user); 
            
            const result = await service.getUserById(user.user_id); 
            
            expect(result).toEqual(userSafe);
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith( 
                user.user_id
            ); 
        });

        test('Debe lanzar un error si no encuentra ningún usuario', async () => {
            const user_id='123'; 

            mockUserRepository.findById.mockResolvedValue(null); 
            
            await expect(
                service.getUserById(user_id)
            ).rejects.toThrow('Usuario no encontrado');

            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith( 
                user_id
            ); 
        });
    }); 
    
    describe('searchUsers', () => { 
        test('Debe mandar los datos de búsqueda y devolver los usuarios que coincidan', async () => {
            const users = [{ 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
            },{ 
                user_id:'124',
                name: 'Alexander2', 
                lastname: 'Mota2', 
                username: 'alex2', 
                email: 'alex2@test.com', 
            }]; 

            const query = 'alex';
            const user_id = '122';
            const task_id = '1';

            mockUserRepository.searchUsers.mockResolvedValue(users); 
            
            const result = await service.searchUsers(query, user_id, task_id); 
            
            expect(result).toEqual(users);
            expect(mockUserRepository.searchUsers).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.searchUsers).toHaveBeenCalledWith( 
                query, user_id, task_id
            ); 
        });
        test('Debe mandar los datos de búsqueda y devolver conjunto vacío si no encuentra coincidencias', async () => {
            const users = []; 

            const query = 'alex';
            const user_id = '122';
            const task_id = '1';

            mockUserRepository.searchUsers.mockResolvedValue(users); 
            
            const result = await service.searchUsers(query, user_id, task_id); 
            
            expect(result).toEqual(users);
            expect(mockUserRepository.searchUsers).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.searchUsers).toHaveBeenCalledWith( 
                query, user_id, task_id
            ); 
        });
    }); 
    
    describe('updateAvatar', () => { 
        test('Debe mandar los datos para actualizar el avatar y devolver confirmación de que el avatar se ha actualizado', async () => {
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                avatar_url : 'url_del_avatar'
            }
            const new_avatar_url = 'nueva_url_del_avatar';

            mockUserRepository.findById.mockResolvedValue(user);
            mockUserRepository.updateAvatar.mockResolvedValue(true);
            
            const result = await service.updateAvatar(user.user_id, new_avatar_url); 

            expect(result).toEqual(true);
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledWith( 
                user.user_id, new_avatar_url
            ); 
        });
        test('Debe lanzar un error si no encuentra ningún usuario', async () => {
            const user_id='123'; 
            const avatar_url = 'url_del_avatar';

            mockUserRepository.findById.mockResolvedValue(null); 
            
            await expect(
                service.updateAvatar(user_id,avatar_url)
            ).rejects.toThrow('Usuario no encontrado');

            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user_id); 
        });
    }); 
    describe('actualizarPerfil', () => { 
        test('Debe mandar los datos para actualizar y devolver el perfil actualizado', async() => { 
            
            const user = { 
                user_id: '123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com'
            }
            const newUsername = 'alexsito'
            user.username = newUsername;
            
            mockUserRepository.updateProfile.mockResolvedValue(user); 

            const result = await service.actualizarPerfil(user.user_id, user); 

            expect(result).toEqual(user);

            expect(mockUserRepository.updateProfile).toHaveBeenCalledTimes(1);
            expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(user.user_id, user); 
        }); 
        test('Debe mandar los datos para actualizar y devolver null cuando no se actualiza', async() => { 
            
            const user = { 
                user_id: '123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com'
            }
            const newUsername = 'alexsito'
            user.username = newUsername;
            
            mockUserRepository.updateProfile.mockResolvedValue(null); 

            const result = await service.actualizarPerfil(user.user_id, user); 

            expect(result).toEqual(null);
            expect(mockUserRepository.updateProfile).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updateProfile).toHaveBeenCalledWith(user.user_id, user); 
        }); 
    }); 
    describe('actualizarPassword', () => { 
        test('Debe mandar los datos para actualizar la contraseña y confirmar si se completó la operación', async() => { 

            const newPassword = 'nueva_contraseña123';
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const { password, ...userSafe } = user;

            mockBcryptHash.mockResolvedValue(newPassword); 
            mockUserRepository.findById.mockResolvedValue(user); 
            mockUserRepository.updatePassword.mockResolvedValue(true); 

            const result = await service.actualizarPassword( user.user_id, user.password, newPassword );
            
            expect(result).toEqual(true);
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith( user.user_id); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledWith( 
                user.user_id, user.password, newPassword
            ); 
        });
        
        test('Debe mandar los datos para actualizar la contraseña y confirmar si no se completó la operación', async() => { 

            const newPassword = 'nueva_contraseña123';
            
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const { password, ...userSafe } = user;

            mockBcryptHash.mockResolvedValue(newPassword); 
            mockUserRepository.findById.mockResolvedValue(user); 
            mockUserRepository.updatePassword.mockResolvedValue(false); 

            const result = await service.actualizarPassword( user.user_id, user.password, newPassword );
            
            expect(result).toEqual(false);
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith( user.user_id); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledWith( 
                user.user_id, user.password, newPassword
            );
        }); 
        test('Debe actualizar la contraseña cuando la contraseña actual hasheada es correcta', async () => { 
            const currentPassword = 'contraseña123'; 
            const newPassword = 'nueva_contraseña123'; 
            const hashedCurrentPassword = '$2b$10$hash_de_la_contraseña_actual'; 
            const hashedNewPassword = '$2b$10$hash_de_la_nueva_contraseña'; 
            const user = { 
                user_id: '123', 
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: hashedCurrentPassword 
            }; 
            
            mockUserRepository.findById .mockResolvedValue(user); 
            mockBcryptCompare.mockResolvedValue(true); 
            mockBcryptHash.mockResolvedValue(hashedNewPassword); 
            mockUserRepository.updatePassword.mockResolvedValue(true); 
            
            const result = await service.actualizarPassword( 
                user.user_id, currentPassword, newPassword ); 

            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 
            expect(mockBcryptCompare).toHaveBeenCalledTimes(1); 
            expect(mockBcryptCompare).toHaveBeenCalledWith( currentPassword, hashedCurrentPassword ); 
            expect(mockBcryptHash).toHaveBeenCalledTimes(1); 
            expect(mockBcryptHash).toHaveBeenCalledWith( newPassword, 10 ); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updatePassword).toHaveBeenCalledWith( user.user_id, hashedCurrentPassword, hashedNewPassword ); 
            
            expect(result).toBe(true); 
        });
        
        test('Debe lanzar un error si la contraseña nueva tiene algún defecto', async() => { 

            const newPassword = 'nueva_contraseña123';
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123' 
            }; 
            const { password, ...userSafe } = user;

            mockBcryptHash.mockResolvedValue(newPassword); 
            mockUserRepository.findById.mockResolvedValue(null); 
            mockUserRepository.updatePassword.mockResolvedValue(false); 
            
            await expect(
                service.actualizarPassword( userSafe.user_id, password, newPassword )
            ).rejects.toThrow('Contraseña incorrecta');
        }); 
    }); 
    describe('deleteAvatar', () => { 
        test('Debe mandar los datos para eliminar el avatar y devolver el usuario sin avatar', async  () => { 
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123',
                avatar_url: 'avatar.jpg'
            }; 
            const { password, ...userSafe } = user;
            userSafe.avatar_url = null;
 
            mockUnlink.mockResolvedValue(undefined);
            mockUserRepository.findById.mockResolvedValue(user); 
            mockUserRepository.updateAvatar.mockResolvedValue([{affectedRows : 1}]); 
            
            const result = await service.deleteAvatar(user.user_id); 

            expect(result).toEqual(userSafe);
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledWith(user.user_id, null); 
        });
        test('Debe lanzar un error si hay algún problema actualizando el avatar', async  () => { 
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123',
                avatar_url: 'avatar.jpg'
            }; 
            const { password, ...userSafe } = user;
            userSafe.avatar_url = null;
            
            mockUnlink.mockResolvedValue(undefined);
            mockUserRepository.findById.mockResolvedValue(user); 
            mockUserRepository.updateAvatar.mockResolvedValue(false); 

            await expect(
                service.deleteAvatar( user.user_id)
            ).rejects.toThrow('Hubo un problema inesperado al intentar eliminar el avatar');
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledWith(user.user_id, null); 

        });
        test('Debe lanzar un error si el usuario no existe', async  () => { 
            const user_id='123';
 
            mockUserRepository.findById.mockResolvedValue(null); 

            await expect(
                service.deleteAvatar(user_id)
            ).rejects.toThrow('Usuario no encontrado');
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user_id); 

        });
        test('Debe lanzar un error si el usuario no tiene avatar', async  () => { 
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123',
                avatar_url: null
            }
 
            mockUserRepository.findById.mockResolvedValue(user); 

            await expect(
                service.deleteAvatar(user.user_id)
            ).rejects.toThrow('El usuario no tiene avatar');
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 

        });
        test('Debe lanzar un warning por consola si el usuario tiene avatar_url pero no se encuentra archivo del avatar', async  () => { 
            const user = { 
                user_id:'123',
                name: 'Alexander', 
                lastname: 'Mota', 
                username: 'alex', 
                email: 'alex@test.com', 
                password: 'contraseña123',
                avatar_url: 'avatar.jpg'
            }; 
            const { password, ...userSafe } = user;
            userSafe.avatar_url = null;
            
            mockUserRepository.findById.mockResolvedValue(user); 
            mockUserRepository.updateAvatar.mockResolvedValue([{ affectedRows: 1 }]); 
            mockUnlink.mockRejectedValue(
                new Error('Fichero no encontrado')
            );
            const consoleWarnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {});
            const result = await service.deleteAvatar( user.user_id)
            expect(result).toEqual(userSafe);
            
            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.findById).toHaveBeenCalledWith(user.user_id); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.updateAvatar).toHaveBeenCalledWith(user.user_id, null); 
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'No se pudo eliminar el fichero:',
                'Fichero no encontrado'
            );
            consoleWarnSpy.mockRestore();
        });

    });
    describe('deleteProfile', () => { 
        test('Debe mandar los datos para eliminar al usuario y devolver confirmación', async  () => { 
            const user_id ='123'; 
 
            mockUserRepository.delete.mockResolvedValue(true);  
            
            const result = await service.deleteProfile(user_id); 

            expect(result).toEqual(true);
            expect(mockUserRepository.delete).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.delete).toHaveBeenCalledWith(user_id); 

        });
        test('Debe mandar los datos para eliminar al usuario y notificar si hubo algún fallo', async  () => { 
            const user_id ='123'; 
 
            mockUserRepository.delete.mockResolvedValue(false);  
            
            const result = await service.deleteProfile(user_id); 

            expect(result).toEqual(false);
            expect(mockUserRepository.delete).toHaveBeenCalledTimes(1); 
            expect(mockUserRepository.delete).toHaveBeenCalledWith(user_id); 
        });
    });
});