import { jest } from '@jest/globals';
import UserRepository from '../../../src/repositories/UserRepository.js';


describe('UserRepository', () => {

    let repository;
    let mockDBPool;

    beforeEach(() => {

        mockDBPool = {
            query: jest.fn()
        };

        repository = new UserRepository({
            DBPool: mockDBPool
        });

    });

    describe('register', () => {

        test('Debe registrar un usuario y devolverlo', async () => {

    const newUser = {
        user_id: '123',
        name: null,
        lastname: null,
        username: 'alexnick',
        email: 'alex@test.com',
        phone: null,
        password: 'password123'
    };

    mockDBPool.query.mockResolvedValue([{}]);

    const result = await repository.register(newUser);

    expect(result).toBe(newUser);

    expect(mockDBPool.query).toHaveBeenCalledTimes(1);

    expect(mockDBPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [
            '123',
            null,
            null,
            'alexnick',
            'alex@test.com',
            null,
            'password123',
            5
        ]
    );
});
        test('Debe propagar el error si falla el registro', async () => {

            const newUser = {
                phone: '123456789',
                password: 'password123'
            };

            const error = new Error('Error de base de datos');

            mockDBPool.query.mockRejectedValue(error);

            await expect(
                repository.register(newUser)
            ).rejects.toThrow('Error de base de datos');
        });
    })

    
    describe('findByEmail', () => {

        test('Debe devolver el usuario cuando existe', async () => {

            const user = {
                user_id: '123',
                username: 'alex',
                email: 'alex@test.com'
            };

            mockDBPool.query.mockResolvedValue([[user]]);

            const result = await repository.findByEmail('alex@test.com');

            expect(result).toEqual(user);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE email = ?'),
                ['alex@test.com']
            );
        });
        test('Debe devolver null cuando el usuario no existe', async () => {

            mockDBPool.query.mockResolvedValue([[]]);

            const result = await repository.findByEmail('noexiste@test.com');

            expect(result).toBeNull();
        });
    });


    describe('findById', () => {

        test('Debe devolver el usuario cuando existe', async () => {

            const user = {
                user_id: '123',
                username: 'alex',
                email: 'alex@test.com'
            };

            mockDBPool.query.mockResolvedValue([[user]]);

            const result = await repository.findById('123');

            expect(result).toEqual(user);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ?'),
                ['123']
            );

        });
        test('Debe devolver null cuando el usuario no existe', async () => {

            mockDBPool.query.mockResolvedValue([[]]);

            const result = await repository.findById('noexiste');

            expect(result).toBeNull();
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ?'),
                ['noexiste']
            );
        });
    });

    describe('searchUsers', () => {

        test('Debe devolver los usuarios que coinciden con la búsqueda', async () => {

            const users = [
                {
                    user_id: '456',
                    username: 'alexander',
                    avatar_url: 'avatar.jpg'
                },
                {
                    user_id: '789',
                    username: 'alex',
                    avatar_url: null
                }
            ];

            mockDBPool.query.mockResolvedValue([users]);

            const result = await repository.searchUsers(
                'alex', '123', 10
            );

            expect(result).toEqual(users);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                [
                    '123',
                    10,
                    10,
                    '%alex%',
                    '%alex%',
                    '%alex%',
                    '%alex%'
                ]
            );
        });
        test('Debe devolver un array vacío cuando no encuentra usuarios', async () => {

            mockDBPool.query.mockResolvedValue([[]]);

            const result = await repository.searchUsers(
                'usuarioinexistente',
                '123',
                10
            );

            expect(result).toEqual([]);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
        });
    });


    describe('updateAvatar', () => {

        test('Debe devolver \'affectedRows = 1\' cuando actualiza el avatar del usuario', async () => {

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 1 }
            ]);

            const result = await repository.updateAvatar('123', '234');

            expect(result).toEqual(true);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ?'),
                ['234', '123']
            );
        });
        test('Debe devolver \'affectedRows = 0\' cuando el usuario no existe', async () => {

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 0 }
            ]);

            const result = await repository.updateAvatar('234', '234');

            expect(result).toEqual(false);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ?'),
                ['234', '234']
            );
        });
    });


    describe('updateProfile', () => {

        test('Debe devolver el usuario cuando lo actualiza', async () => {

            const profile = {
                name: 'Alexander',
                lastname: 'Mota',
                username: 'alex',
                phone: '600123456'
            };

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 1 }
            ]);

            const result = await repository.updateProfile('123', profile);

            expect(result).toEqual(profile);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE users'),
                [
                    'Alexander',
                    'Mota',
                    'alex',
                    '600123456',
                    '123'
                ]
            );
        });
        test('Debe devolver null cuando no se actualiza ningún usuario', async () => {

            const profile = {
                name: 'Alexander',
                lastname: 'Mota',
                username: 'alex',
                phone: '600123456'
            };

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 0 }
            ]);

            const result = await repository.updateProfile('999', profile);

            expect(result).toBeNull();
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
        });
    });


    describe('updatePassword', () => {

        test('Debe devolver \'true\' cuando actualiza la contraseña', async () => {

            const user_id = '123'; 
            const currentPassword = 'password123';
            const newPassword = 'password234';

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 1 }
            ]);

            const result = await repository.updatePassword(user_id, currentPassword, newPassword);

            expect(result).toEqual(true);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ? AND password = ?'),
                [ newPassword, user_id, currentPassword ]
            );
        });
        test('Debe devolver \'false\' cuando no actualiza la contraseña', async () => {

            const user_id = '123'; 
            const currentPassword = 'password123';
            const newPassword = 'password234';

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 0 }
            ]);

            const result = await repository.updatePassword(user_id, currentPassword, newPassword);

            expect(result).toEqual(false);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE user_id = ? AND password = ?'),
                [ newPassword, user_id, currentPassword ]
            );
        });
    });

    
    describe('delete', () => {

        test('Debe devolver \'true\' si el usuario se elimina', async () => {

            const user_id = '123';

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 1 }
            ]);

            const result = await repository.delete(user_id);

            expect(result).toEqual(true);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM users WHERE user_id = ?'),
                [ user_id ]
            );
        });
        test('Debe devolver \'false\' si el usuario no se elimina', async () => {

            const user_id = '123';

            mockDBPool.query.mockResolvedValue([
                { affectedRows: 0 }
            ]);

            const result = await repository.delete(user_id);

            expect(result).toEqual(false);
            expect(mockDBPool.query).toHaveBeenCalledTimes(1);
            expect(mockDBPool.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM users WHERE user_id = ?'),
                [ user_id ]
            );
        });
    });
});