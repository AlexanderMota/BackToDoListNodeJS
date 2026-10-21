import UserRepository from '../../../src/repositories/UserRepository.js';
import { DBPool } from '../../../src/config/dbconnection.js';

const userRepository = new UserRepository({
    DBPool
});

const createTestUser = (suffix) => ({
    user_id: `test-user-${suffix}`,
    name: 'Usuario',
    lastname: 'Test',
    username: `usuario_test_${suffix}`,
    email: `usuario.test.${suffix}@example.com`,
    phone: '600000000',
    password: 'password_test'
});

describe('UserRepository', () => {

    describe('register', () => {

        test('debe registrar un usuario correctamente', async () => {

            const user = createTestUser('register');

            const result = await userRepository.register(user);

            expect(result).toBeDefined();

            const savedUser = await userRepository.findById(user.user_id);

            expect(savedUser).not.toBeNull();
            expect(savedUser.user_id).toBe(user.user_id);
            expect(savedUser.name).toBe(user.name);
            expect(savedUser.lastname).toBe(user.lastname);
            expect(savedUser.username).toBe(user.username);
            expect(savedUser.email).toBe(user.email);
            expect(savedUser.phone).toBe(user.phone);
            expect(savedUser.password).toBe(user.password);
            expect(savedUser.role).toBeDefined();

            await userRepository.delete(user.user_id);
        });

    });


    describe('findByEmail', () => {

        test('debe encontrar un usuario por su email', async () => {

            const user = createTestUser('find-email');

            await userRepository.register(user);

            const result = await userRepository.findByEmail(user.email);

            expect(result).not.toBeNull();
            expect(result.user_id).toBe(user.user_id);
            expect(result.name).toBe(user.name);
            expect(result.lastname).toBe(user.lastname);
            expect(result.username).toBe(user.username);
            expect(result.email).toBe(user.email);
            expect(result.phone).toBe(user.phone);
            expect(result.password).toBe(user.password);
            expect(result.role).toBeDefined();

            await userRepository.delete(user.user_id);
        });


        test('debe devolver null si el email no existe', async () => {

            const result = await userRepository.findByEmail(
                'email-que-no-existe@example.com'
            );

            expect(result).toBeNull();
        });

    });


    describe('findById', () => {

        test('debe encontrar un usuario por su ID', async () => {

            const user = createTestUser('find-id');

            await userRepository.register(user);

            const result = await userRepository.findById(user.user_id);

            expect(result).not.toBeNull();
            expect(result.user_id).toBe(user.user_id);
            expect(result.name).toBe(user.name);
            expect(result.lastname).toBe(user.lastname);
            expect(result.username).toBe(user.username);
            expect(result.email).toBe(user.email);
            expect(result.phone).toBe(user.phone);
            expect(result.password).toBe(user.password);
            expect(result.role).toBeDefined();

            await userRepository.delete(user.user_id);
        });


        test('debe devolver null si el ID no existe', async () => {

            const result = await userRepository.findById(
                'user-id-que-no-existe'
            );

            expect(result).toBeNull();
        });

    });


    describe('updateAvatar', () => {

        test('debe actualizar el avatar correctamente', async () => {

            const user = createTestUser('avatar');

            await userRepository.register(user);

            const avatarUrl = 'avatars/test-avatar.jpg';

            const result = await userRepository.updateAvatar(
                user.user_id,
                avatarUrl
            );

            expect(result).toBe(true);

            const updatedUser = await userRepository.findById(user.user_id);

            expect(updatedUser.avatar_url).toBe(avatarUrl);

            await userRepository.delete(user.user_id);
        });


        test('debe devolver false si el usuario no existe', async () => {

            const result = await userRepository.updateAvatar(
                'user-id-que-no-existe',
                'avatars/test-avatar.jpg'
            );

            expect(result).toBe(false);
        });

    });


    describe('updateProfile', () => {

        test('debe actualizar el perfil correctamente', async () => {

            const user = createTestUser('profile');

            await userRepository.register(user);

            const profile = {
                name: 'Nombre Actualizado',
                lastname: 'Apellido Actualizado',
                username: 'username_actualizado',
                phone: '611111111'
            };

            const result = await userRepository.updateProfile(
                user.user_id,
                profile
            );

            expect(result).toEqual(profile);

            const updatedUser = await userRepository.findById(user.user_id);

            expect(updatedUser.name).toBe(profile.name);
            expect(updatedUser.lastname).toBe(profile.lastname);
            expect(updatedUser.username).toBe(profile.username);
            expect(updatedUser.phone).toBe(profile.phone);

            await userRepository.delete(user.user_id);
        });


        test('debe devolver null si el usuario no existe', async () => {

            const profile = {
                name: 'Nombre',
                lastname: 'Apellido',
                username: 'username_inexistente',
                phone: '611111111'
            };

            const result = await userRepository.updateProfile(
                'user-id-que-no-existe',
                profile
            );

            expect(result).toBeNull();
        });

    });


    describe('updatePassword', () => {

        test('debe actualizar la contraseña correctamente', async () => {

            const user = createTestUser('password');

            await userRepository.register(user);

            const result = await userRepository.updatePassword(
                user.user_id,
                'password_test',
                'new_password'
            );

            expect(result).toBe(true);

            const updatedUser = await userRepository.findById(user.user_id);

            expect(updatedUser.password).toBe('new_password');

            await userRepository.delete(user.user_id);
        });


        test('debe devolver false si la contraseña actual no coincide', async () => {

            const user = createTestUser('wrong-password');

            await userRepository.register(user);

            const result = await userRepository.updatePassword(
                user.user_id,
                'password_incorrecta',
                'new_password'
            );

            expect(result).toBe(false);

            const unchangedUser = await userRepository.findById(user.user_id);

            expect(unchangedUser.password).toBe(user.password);

            await userRepository.delete(user.user_id);
        });


        test('debe devolver false si el usuario no existe', async () => {

            const result = await userRepository.updatePassword(
                'user-id-que-no-existe',
                'password_test',
                'new_password'
            );

            expect(result).toBe(false);
        });

    });


    describe('delete', () => {

        test('debe eliminar un usuario correctamente', async () => {

            const user = createTestUser('delete');

            await userRepository.register(user);

            const result = await userRepository.delete(user.user_id);

            expect(result).toBe(true);

            const deletedUser = await userRepository.findById(user.user_id);

            expect(deletedUser).toBeNull();
        });


        test('debe devolver false si el usuario no existe', async () => {

            const result = await userRepository.delete(
                'user-id-que-no-existe'
            );

            expect(result).toBe(false);
        });

    });

    afterAll(async () => {
        await DBPool.end();
    });

});