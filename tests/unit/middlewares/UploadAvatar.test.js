
import { jest } from '@jest/globals';
import path from 'node:path';

describe('uploadAvatar', () => {

    let multerConfig;
    let storageConfig;
    let uploadAvatar;

    const mockMulter = jest.fn((config) => {
        multerConfig = config;
        return config;
    });

    const mockDiskStorage = jest.fn((config) => {
        storageConfig = config;
        return config;
    });

    const mockExistsSync = jest.fn(() => false);
    const mockMkdirSync = jest.fn();

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

    // Importar el middleware después de registrar los mocks.
    beforeAll(async () => {
        const module = await import('../../../src/middlewares/UploadAvatar.js');
        uploadAvatar = module.uploadAvatar;
    });

    describe('Configuración de multer', () => {

        test('Debe configurar un límite de 5 MB', () => {
            expect(multerConfig.limits.fileSize)
                .toBe(5 * 1024 * 1024);

            expect(multerConfig.limits.files).toBe(1);
        });

        test('Debe configurar el almacenamiento mediante diskStorage', () => {
            expect(multerConfig.storage).toBe(storageConfig);
            expect(mockDiskStorage).toHaveBeenCalledTimes(1);
        });

        test('Debe configurar el filtro de archivos', () => {
            expect(multerConfig.fileFilter).toBeDefined();
            expect(typeof multerConfig.fileFilter).toBe('function');
        });

        test('Debe crear el directorio si no existe', () => {
            const uploadDir = path.join(
                process.cwd(),
                'uploads',
                'avatars'
            );

            expect(mockExistsSync).toHaveBeenCalledWith(uploadDir);

            expect(mockMkdirSync).toHaveBeenCalledWith(
                uploadDir,
                { recursive: true }
            );
        });

        test('Debe exportar el middleware de multer', () => {
            expect(uploadAvatar).toBe(multerConfig);
        });
    });

    describe('fileFilter', () => {

        test('Debe aceptar archivos JPEG', () => {
            const req = {};
            const file = { mimetype: 'image/jpeg' };
            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledWith(null, true);
        });

        test('Debe aceptar archivos PNG', () => {
            const req = {};
            const file = { mimetype: 'image/png' };
            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledWith(null, true);
        });

        test('Debe aceptar archivos WEBP', () => {
            const req = {};
            const file = { mimetype: 'image/webp' };
            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledWith(null, true);
        });

        test('Debe rechazar archivos que no sean imágenes', () => {
            const req = {};
            const file = { mimetype: 'application/pdf' };
            const cb = jest.fn();

            multerConfig.fileFilter(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);
            expect(cb.mock.calls[0][0]).toBeInstanceOf(Error);
            expect(cb.mock.calls[0][0].message)
                .toBe('Formato de imagen no permitido');
        });
    });

    describe('storage.destination', () => {

        test('Debe guardar los archivos en uploads/avatars', () => {
            const req = {};
            const file = {};
            const cb = jest.fn();

            storageConfig.destination(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);
            expect(cb).toHaveBeenCalledWith(
                null,
                path.join(process.cwd(), 'uploads', 'avatars')
            );
        });
    });

    describe('storage.filename', () => {

        test('Debe generar el nombre usando el user_id y la extensión original', () => {
            const req = {
                user: {
                    user_id: '123'
                }
            };

            const file = {
                originalname: 'avatar.jpg'
            };

            const cb = jest.fn();

            storageConfig.filename(req, file, cb);

            expect(cb).toHaveBeenCalledTimes(1);
            expect(cb.mock.calls[0][0]).toBeNull();
            expect(cb.mock.calls[0][1])
                .toMatch(/^123-\d+\.jpg$/);
        });
    });
});
