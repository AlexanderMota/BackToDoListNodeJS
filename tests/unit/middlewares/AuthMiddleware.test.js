import { jest } from '@jest/globals';

const mockVerify = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        verify: mockVerify
    }
}));

const { authMiddleware } = await import('../../../src/middlewares/AuthMiddleware.js');

describe('authMiddleware', () => {

    let mockRequest;
    let mockResponse;
    let mockNext;

    beforeEach(() => {

        mockRequest = {
            cookies: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();

        mockVerify.mockReset();

        process.env.JWT_SECRET = 'test-secret';
    });

    describe('cuando no existe token', () => {

        test('Debe devolver 403 si no existe el token', () => {

            authMiddleware(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(403);

            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'No autenticado'
            });

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockVerify).not.toHaveBeenCalled();
        });

        test('Debe devolver 403 si req.cookies no existe', () => {

            mockRequest = {};

            authMiddleware(mockRequest, mockResponse, mockNext);

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(403);

            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'No autenticado'
            });

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockVerify).not.toHaveBeenCalled();
        });

    });

    describe('cuando existe un token', () => {

        test('Debe autenticar al usuario si el token es válido', () => {

            const decodedUser = {
                user_id: '123',
                email: 'test@test.com',
                role: 'user'
            };

            mockRequest.cookies.access_token = 'token-valido';

            mockVerify.mockReturnValue(decodedUser);

            authMiddleware(mockRequest, mockResponse, mockNext);

            expect(mockVerify).toHaveBeenCalledTimes(1);
            expect(mockVerify).toHaveBeenCalledWith(
                'token-valido',
                process.env.JWT_SECRET
            );

            expect(mockRequest.user).toEqual(decodedUser);

            expect(mockNext).toHaveBeenCalledTimes(1);

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        test('Debe devolver 400 si el token es inválido o ha expirado', () => {

            mockRequest.cookies.access_token = 'token-invalido';

            mockVerify.mockImplementation(() => {
                throw new Error('Token inválido');
            });

            authMiddleware(mockRequest, mockResponse, mockNext);

            expect(mockVerify).toHaveBeenCalledTimes(1);
            expect(mockVerify).toHaveBeenCalledWith(
                'token-invalido',
                process.env.JWT_SECRET
            );

            expect(mockResponse.status).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).toHaveBeenCalledWith(400);

            expect(mockResponse.json).toHaveBeenCalledTimes(1);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Token inválido o expirado'
            });

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRequest.user).toBeUndefined();
        });

    });

});