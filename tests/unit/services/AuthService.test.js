import { jest } from '@jest/globals';
const mockJwtSign = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign: mockJwtSign
    }
}));

const { default: AuthService } = await import('../../../src/services/AuthService.js');

describe('AuthService', () => {

    let service;
    let mockUserRepository;
    let mockUserValidations;


    beforeEach(() => {

        mockUserRepository = {
            findById: jest.fn(),
            findByEmail: jest.fn()
        };

        mockUserValidations = {
            validateEmail: jest.fn()
        };

        service = new AuthService({
            UserRepository: mockUserRepository,
            UserValidations: mockUserValidations
        });

    });


    describe('getMe', () => {

        test('Debe devolver el usuario cuando existe', async () => {

            const user = {
                user_id: '123',
                name: 'Alexander',
                lastname: 'Mota',
                username: 'alex',
                email: 'alex@test.com'
            };

            mockUserRepository.findById.mockResolvedValue(user);


            const result = await service.getMe(user.user_id);


            expect(result).toEqual(user);

            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);

            expect(mockUserRepository.findById)
                .toHaveBeenCalledWith(user.user_id);

        });


        test('Debe lanzar un error cuando el usuario no existe', async () => {

            mockUserRepository.findById.mockResolvedValue(null);


            await expect(
                service.getMe('999')
            ).rejects.toThrow('Usuario no encontrado');


            expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);

            expect(mockUserRepository.findById)
                .toHaveBeenCalledWith('999');

        });

    });


    describe('login', () => {
        test('Debe devolver el token del usuario cuando las credenciales son correctas', async () => {

            const email = 'alex@test.com'
            const password = 'contraseña123'

            mockUserValidations.validateEmail.mockResolvedValue(true);

            mockUserRepository.findByEmail.mockResolvedValue({
                user_id:'123',
                email:email, 
                password:password,
                role:'user'
            });

            mockJwtSign.mockReturnValue('token');

            const result = await service.login(email,password);

            expect(result).toEqual('token');

            expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);

            expect(mockUserRepository.findByEmail)
                .toHaveBeenCalledWith(email);

        });
        test('Debe lanzar un error si la contraseña es incorrecta', async () => {

            const email = 'alex@test.com'
            const password = 'contraseña123'

            mockUserValidations.validateEmail.mockResolvedValue(true);

            mockUserRepository.findByEmail.mockResolvedValue({
                user_id:'123',
                email:email, 
                password:password,
                role:'user'
            });

            await expect(
                service.login(email,password+4)
            ).rejects.toThrow('Contraseña incorrecta');


            expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);

            expect(mockUserRepository.findByEmail)
                .toHaveBeenCalledWith(email);

        });
        test('Debe lanzar un error si el email es incorrecto', async () => {

            const email = 'noexiste@test.com'
            const password = 'contraseña123'

            mockUserValidations.validateEmail.mockResolvedValue(true);

            mockUserRepository.findByEmail.mockResolvedValue(null);

            await expect(
                service.login(email,password)
            ).rejects.toThrow('Usuario no encontrado'); 


            expect(mockUserRepository.findByEmail).toHaveBeenCalledTimes(1);

            expect(mockUserRepository.findByEmail)
                .toHaveBeenCalledWith(email);

        });
        test('Debe lanzar un error si el formato del email es incorrecto', async () => {

            const email = 'formato_incorrecto'
            const password = 'contraseña123'

            mockUserValidations.validateEmail.mockResolvedValue(false);

            await expect(
                service.login(email,password)
            ).rejects.toThrow('Formato email incorrecto'); 


            expect(mockUserValidations.validateEmail).toHaveBeenCalledTimes(1);

            expect(mockUserValidations.validateEmail)
                .toHaveBeenCalledWith(email);

        });

    });
});

