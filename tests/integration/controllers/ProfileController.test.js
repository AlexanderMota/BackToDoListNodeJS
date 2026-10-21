import ProfileController from '../../../src/controllers/ProfileController.js';
import ProfileService from '../../../src/services/ProfileService.js';
import UserRepository from '../../../src/repositories/UserRepository.js';
import { DBPool } from '../../../src/config/dbconnection.js';

import { jest } from '@jest/globals';
import { afterAll } from '@jest/globals';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';

describe('ProfileController', () => {

    let controller;
    let userRepository;
    let profileService;

    const testUser = {
        user_id: 'profile-controller-test',
        name: 'Test',
        lastname: 'Profile',
        username: 'profile_controller_test',
        email: 'profile.controller@test.com',
        phone: '600000000',
        password: 'password123'
    };

    beforeAll(async () => {
        const hashedPassword = await bcrypt.hash(testUser.password, 10);

        userRepository = new UserRepository({ DBPool });

        profileService = new ProfileService({
            UserRepository: userRepository
        });

        controller = new ProfileController({
            ProfileService: profileService
        });

        await DBPool.query(
            `DELETE FROM users WHERE user_id = ?`,
            [testUser.user_id]
        );

        await DBPool.query(
            `
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
            `,
            [
                testUser.user_id,
                testUser.name,
                testUser.lastname,
                testUser.username,
                testUser.email,
                testUser.phone,
                hashedPassword,
                5
            ]
        );
    });


    describe('searchUsers', () => {
        test('Debe devolver los usuarios que coinciden con la búsqueda y que pueden ser añadidos a la tarea', async () => {

            const searchUser = {
                user_id: 'profile-search-test-user',
                name: 'Search',
                lastname: 'User',
                username: 'search_test_user',
                email: 'search.test@test.com',
                phone: '633333333',
                password: 'password123'
            };

            const excludedUser = {
                user_id: 'profile-search-excluded',
                name: 'Search',
                lastname: 'Excluded',
                username: 'search_excluded_user',
                email: 'search.excluded@test.com',
                phone: '644444444',
                password: 'password123'
            };

            let taskId;

            try {
                await DBPool.query(
                    'DELETE FROM users WHERE user_id IN (?, ?)',
                    [searchUser.user_id, excludedUser.user_id]
                );

                await DBPool.query(
                    `
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
                    `,
                    [
                        searchUser.user_id,
                        searchUser.name,
                        searchUser.lastname,
                        searchUser.username,
                        searchUser.email,
                        searchUser.phone,
                        searchUser.password,
                        5
                    ]
                );

                await DBPool.query(
                    `
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
                    `,
                    [
                        excludedUser.user_id,
                        excludedUser.name,
                        excludedUser.lastname,
                        excludedUser.username,
                        excludedUser.email,
                        excludedUser.phone,
                        excludedUser.password,
                        5
                    ]
                );

                const [taskResult] = await DBPool.query(
                    `
                    INSERT INTO tasks (
                        name,
                        description,
                        status,
                        priority,
                        parent_task_id,
                        created_by,
                        visibility
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    `,
                    [
                        'Tarea searchUsers',
                        'Tarea para probar búsqueda de usuarios',
                        'pending',
                        'medium',
                        null,
                        testUser.user_id,
                        'private'
                    ]
                );

                taskId = taskResult.insertId;

                await DBPool.query(
                    `
                    INSERT INTO user_tasks (user_id, task_id)
                    VALUES (?, ?)
                    `,
                    [excludedUser.user_id, taskId]
                );

                await DBPool.query(
                    `
                    INSERT INTO requests_task (
                        task_id,
                        user_id,
                        sender_user_id,
                        status
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        taskId,
                        excludedUser.user_id,
                        testUser.user_id,
                        'pending'
                    ]
                );

                const req = {
                    user: {
                        user_id: testUser.user_id
                    },
                    params: {
                        query: 'search'
                    },
                    query: {
                        task_id: taskId
                    }
                };

                const res = {
                    json: jest.fn(),
                    status: jest.fn().mockReturnThis()
                };

                await controller.searchUsers(req, res);

                expect(res.json).toHaveBeenCalledTimes(1);

                const response = res.json.mock.calls[0][0];

                expect(response.message).toBe('Perfiles encontrados (1)');
                expect(response.users).toHaveLength(1);

                expect(response.users[0]).toEqual({
                    user_id: searchUser.user_id,
                    username: searchUser.username,
                    avatar_url: null
                });

                expect(
                    response.users.some(
                        user => user.user_id === excludedUser.user_id
                    )
                ).toBe(false);

            } finally {
                if (taskId) {
                    await DBPool.query(
                        'DELETE FROM requests_task WHERE task_id = ?',
                        [taskId]
                    );

                    await DBPool.query(
                        'DELETE FROM user_tasks WHERE task_id = ?',
                        [taskId]
                    );

                    await DBPool.query(
                        'DELETE FROM tasks WHERE task_id = ?',
                        [taskId]
                    );
                }

                await DBPool.query(
                    'DELETE FROM users WHERE user_id IN (?, ?)',
                    [searchUser.user_id, excludedUser.user_id]
                );
            }
        });
    });
    describe('subirFotoDePerfil', () => {
        test('Debe actualizar el avatar del usuario', async () => {

            const avatarFilename = 'profile-controller-test-avatar.jpg';

            const req = {
                user: {
                    user_id: testUser.user_id
                },
                file: {
                    filename: avatarFilename
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.subirFotoDePerfil(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Avatar actualizado');

            expect(response.user).toBeDefined();
            expect(response.user.avatar_url).toBe(avatarFilename);

            // Comprobamos que el cambio llegó realmente a MySQL
            const [rows] = await DBPool.query(
                'SELECT avatar_url FROM users WHERE user_id = ?',
                [testUser.user_id]
            );

            expect(rows).toHaveLength(1);
            expect(rows[0].avatar_url).toBe(avatarFilename);
        });
    });
    describe('verPerfil', () => {

        test('Debe devolver el perfil de un usuario existente', async () => {

            const req = {
                user: {
                    user_id: testUser.user_id
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.verPerfil(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil encontrado');

            expect(response.user).toBeDefined();
            expect(response.user.user_id).toBe(testUser.user_id);
            expect(response.user.name).toBe(testUser.name);
            expect(response.user.lastname).toBe(testUser.lastname);
            expect(response.user.username).toBe(testUser.username);
            expect(response.user.email).toBe(testUser.email);
            expect(response.user.phone).toBe(testUser.phone);

            expect(response.user.password).toBeUndefined();
        });
        
    });
    describe('actualizarPerfil', () => {
        test('actualizarPerfil - debe actualizar los datos del perfil', async () => {

            const perfil = {
                name: 'Updated',
                lastname: 'Profile',
                username: 'profile_controller_updated',
                phone: '611111111'
            };

            const req = {
                user: {
                    user_id: testUser.user_id
                },
                body: {
                    perfil
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.actualizarPerfil(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil actualizado');

            expect(response.user).toBeDefined();

            expect(response.user.name).toBe(perfil.name);
            expect(response.user.lastname).toBe(perfil.lastname);
            expect(response.user.username).toBe(perfil.username);
            expect(response.user.phone).toBe(perfil.phone);

            // Comprobamos que realmente se modificó MySQL
            const [rows] = await DBPool.query(
                `
                SELECT name, lastname, username, phone
                FROM users
                WHERE user_id = ?
                `,
                [testUser.user_id]
            );

            expect(rows).toHaveLength(1);

            expect(rows[0].name).toBe(perfil.name);
            expect(rows[0].lastname).toBe(perfil.lastname);
            expect(rows[0].username).toBe(perfil.username);
            expect(rows[0].phone).toBe(perfil.phone);
        });
    });
    describe('actualizarPassword', () => {
        test('Debe actualizar la contraseña del usuario', async () => {

            const currentPassword = testUser.password;
            const newPassword = 'newPassword123';

            const req = {
                user: {
                    user_id: testUser.user_id
                },
                body: {
                    password: {
                        currentPassword,
                        newPassword
                    }
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.actualizarPassword(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil actualizado.');

            expect(response.user).toEqual(req.user);

            // Comprobamos la BD
            const [rows] = await DBPool.query(
                `
                SELECT password
                FROM users
                WHERE user_id = ?
                `,
                [testUser.user_id]
            );

            expect(rows).toHaveLength(1);

            const storedPassword = rows[0].password;

            expect(storedPassword).not.toBe(currentPassword);

            const passwordMatches = await bcrypt.compare(
                newPassword,
                storedPassword
            );

            expect(passwordMatches).toBe(true);
        });
    });
    describe('deleteFotoDePerfil', () => {
        test('Debe eliminar el avatar del usuario', async () => {

            const avatarFilename = 'profile-controller-test-delete.jpg';

            const avatarDir = path.join(
                process.cwd(),
                'uploads',
                'avatars'
            );

            const avatarPath = path.join(
                avatarDir,
                avatarFilename
            );

            await fs.mkdir(avatarDir, { recursive: true });

            await fs.writeFile(avatarPath, 'avatar de prueba');

            await DBPool.query(
                `
                UPDATE users
                SET avatar_url = ?
                WHERE user_id = ?
                `,
                [avatarFilename, testUser.user_id]
            );

            const req = {
                user: {
                    user_id: testUser.user_id
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.deleteFotoDePerfil(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil actualizado.');
            expect(response.user).toEqual({
                avatar_url: null
            });

            const [rows] = await DBPool.query(
                `
                SELECT avatar_url
                FROM users
                WHERE user_id = ?
                `,
                [testUser.user_id]
            );

            expect(rows).toHaveLength(1);
            expect(rows[0].avatar_url).toBeNull();

            await expect(
                fs.access(avatarPath)
            ).rejects.toThrow();
        });
    });
    describe('deletePerfil', () => {
        test('Debe eliminar el perfil del usuario', async () => {

            const deleteUser = {
                user_id: 'profile-controller-delete-test',
                name: 'Delete',
                lastname: 'Profile',
                username: 'profile_controller_delete_test',
                email: 'profile.controller.delete@test.com',
                phone: '622222222',
                password: 'password123'
            };

            // Nos aseguramos de que no exista de una ejecución anterior
            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [deleteUser.user_id]
            );

            await DBPool.query(
                `
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
                `,
                [
                    deleteUser.user_id,
                    deleteUser.name,
                    deleteUser.lastname,
                    deleteUser.username,
                    deleteUser.email,
                    deleteUser.phone,
                    deleteUser.password,
                    5
                ]
            );

            const req = {
                user: {
                    user_id: deleteUser.user_id
                }
            };

            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            await controller.deleteProfile(req, res);

            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil eliminado.');

            expect(response.user).toEqual({});

            const [rows] = await DBPool.query(
                'SELECT user_id FROM users WHERE user_id = ?',
                [deleteUser.user_id]
            );

            expect(rows).toHaveLength(0);
        });
    });
    afterAll(async () => {

        await DBPool.query(
            `DELETE FROM users WHERE user_id = ?`,
            [testUser.user_id]
        );
        await DBPool.end();
    });
});