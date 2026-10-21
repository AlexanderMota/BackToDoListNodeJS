import { jest } from '@jest/globals';

let multerConfig;
let storageConfig;

const mockMulter = jest.fn((config) => {
    multerConfig = config;
    return config;
});

const mockDiskStorage = jest.fn((config) => {
    storageConfig = config;
    return config;
});

const mockExistsSync = jest.fn(() => true);
const mockMkdirSync = jest.fn();

const mockExtname = jest.fn(() => '.jpg');

jest.unstable_mockModule('multer', () => ({
    default: Object.assign(mockMulter, {
        diskStorage: mockDiskStorage
    })
}));

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        mkdirSync: mockMkdirSync
    }
}));

jest.unstable_mockModule('path', () => ({
    default: {
        extname: mockExtname
    }
}));

const { uploadAvatar } = await import(
    '../../../src/middlewares/UploadAvatar.js'
);

describe('uploadAvatar', () => {

    beforeEach(() => {

        jest.clearAllMocks();

    });

    describe('configuración de multer', () => {

        test('Debe configurar un límite de 5 MB', () => {

            expect(multerConfig.limits.fileSize)
                .toBe(5 * 1024 * 1024);
        });

        test('Debe configurar el almacenamiento mediante diskStorage', () => {
            expect(multerConfig.storage)
                .toBe(storageConfig);
        });

        test('Debe configurar el filtro de archivos', () => {

            expect(multerConfig.fileFilter)
                .toBeDefined();

            expect(typeof multerConfig.fileFilter)
                .toBe('function');
        });
    });

    describe('fileFilter', () => {

        test('Debe aceptar archivos de imagen', () => {

            const req = {};

            const file = {
                mimetype: 'image/jpeg'
            };

            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);

            expect(cb).toHaveBeenCalledWith(
                null,
                true
            );

        });

        test('Debe aceptar cualquier formato MIME que empiece por image/', () => {

            const req = {};

            const file = {
                mimetype: 'image/png'
            };

            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);

            expect(cb).toHaveBeenCalledWith(
                null,
                true
            );

        });

        test('Debe rechazar archivos que no sean imágenes', () => {

            const req = {};

            const file = {
                mimetype: 'application/pdf'
            };

            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);

            expect(cb.mock.calls[0][0])
                .toBeInstanceOf(Error);

            expect(cb.mock.calls[0][0].message)
                .toBe('Solo se permiten imágenes');

        });

    });

    describe('storage.destination', () => {

        test('Debe guardar los archivos en uploads/avatars', () => {

            const req = {};
            const file = {};
            const cb = jest.fn();

            multerConfig.storage.destination(
                req,
                file,
                cb
            );

            expect(cb).toHaveBeenCalledTimes(1);

            expect(cb).toHaveBeenCalledWith(
                null,
                'uploads/avatars'
            );

        });

    });

    describe('storage.filename', () => {

        test('Debe generar el nombre del archivo usando el user_id y la extensión original', () => {

            const req = {
                user: {
                    user_id: '123'
                }
            };

            const file = {
                originalname: 'avatar.jpg'
            };

            const cb = jest.fn();

            mockExtname.mockReturnValue('.jpg');

            multerConfig.storage.filename(
                req,
                file,
                cb
            );

            expect(mockExtname).toHaveBeenCalledTimes(1);

            expect(mockExtname).toHaveBeenCalledWith(
                'avatar.jpg'
            );

            expect(cb).toHaveBeenCalledTimes(1);

            expect(cb.mock.calls[0][0])
                .toBeNull();

            expect(cb.mock.calls[0][1])
                .toMatch(/^123-\d+\.jpg$/);

        });

    });

});