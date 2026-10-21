import AuthController from '../../../src/controllers/AuthController.js';
import ProfileService from '../../../src/services/ProfileService.js';
import AuthService from '../../../src/services/AuthService.js';
import UserRepository from '../../../src/repositories/UserRepository.js';
import {UserValidations} from '../../../src/validations/index.js';
import { DBPool } from '../../../src/config/dbconnection.js';

import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';

describe('AuthController', () => { 

    let controller;

    beforeAll(async () => {

        controller = new AuthController({
            AuthService: new AuthService({
                UserRepository:new UserRepository({ DBPool }),
                UserValidations: new UserValidations()
            }),
            ProfileService: new ProfileService({ 
                UserRepository: new UserRepository({ DBPool }) 
            })
        });

    });
    
    describe('createProfile', () => {
        test('Debe crear un nuevo usuario correctamente', async () => {
            const user = {
                name: 'Auth',
                lastname: 'Controller',
                username: 'auth_controller_create',
                email: 'auth.controller.create@test.com',
                phone: '655555555',
                password: 'password123'
            };

            // Limpiar por si el test se ejecutó anteriormente
            await DBPool.query(
                `
                DELETE FROM users
                WHERE username = ? OR email = ?
                `,
                [user.username, user.email]
            );

            const req = {
                body: {
                    user
                }
            };

            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            const originalPassword = user.password;

            await controller.createProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledTimes(1);

            const response = res.json.mock.calls[0][0];

            expect(response.message).toBe('Perfil creado.');
            expect(response.user).toBeDefined();

            // comprobar que el usuario existe realmente en MySQL
            const [rows] = await DBPool.query(
                `
                SELECT
                    user_id,
                    name,
                    lastname,
                    username,
                    email,
                    phone,
                    password,
                    role_id
                FROM users
                WHERE username = ?
                `,
                [user.username]
            );

            expect(rows).toHaveLength(1);

            const createdUser = rows[0];

            expect(createdUser.name).toBe(user.name);
            expect(createdUser.lastname).toBe(user.lastname);
            expect(createdUser.username).toBe(user.username);
            expect(createdUser.email).toBe(user.email);
            expect(createdUser.phone).toBe(user.phone);
            expect(createdUser.role_id).toBe(5);

            // La contraseña almacenada NO debe ser la original
            expect(createdUser.password).not.toBe(originalPassword);

            // Y debe corresponder a la contraseña original
            const passwordMatches = await bcrypt.compare(
                originalPassword,
                createdUser.password
            );

            expect(passwordMatches).toBe(true);

            // Limpiar
            await DBPool.query(
                'DELETE FROM users WHERE user_id = ?',
                [createdUser.user_id]
            );
        });
    });
    afterAll(async () => {
        await DBPool.end();
    });
});