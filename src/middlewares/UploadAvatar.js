
import multer from "multer";
import path from "node:path";
import fs from "fs";
import { fileTypeFromFile } from "file-type";

const uploadDir = path.join(process.cwd(), "uploads", "avatars");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const storage = multer.diskStorage({

    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {

        const ext = path.extname(file.originalname).toLowerCase();

        cb(
            null,
            `${req.user.user_id}-${Date.now()}${ext}`
        );

    }

});

export const uploadAvatar = multer({

    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter(req, file, cb) {

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Formato de imagen no permitido"));
        }

    }

});

export const validateAvatar = async (req, res, next) => {

    if (!req.file) {
        return res.status(400).json({
            error: "Debes seleccionar una imagen"
        });
    }

    try {

        const fileType = await fileTypeFromFile(req.file.path);

        if (!fileType || !allowedMimeTypes.includes(fileType.mime)) {

            await fs.promises.unlink(req.file.path);

            return res.status(400).json({
                error: "El archivo no es una imagen válida"
            });

        }

        const correctExtensions = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp"
        };

        const correctExtension = correctExtensions[fileType.mime];

        const newFilename = `${req.user.user_id}-${Date.now()}${correctExtension}`;

        const newPath = path.join(uploadDir, newFilename);

        await fs.promises.rename(req.file.path, newPath);

        req.file.filename = newFilename;

        return next();

    } catch (error) {

        if (req.file?.path) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }

        return res.status(400).json({
            error: "No se pudo validar la imagen"
        });

    }

};
