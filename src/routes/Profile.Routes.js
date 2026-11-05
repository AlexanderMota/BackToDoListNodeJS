import { authMiddleware } from '../middlewares/AuthMiddleware.js';
import { uploadAvatar } from '../middlewares/UploadAvatar.js';
import { Router } from 'express';
import { validateAvatar } from '../middlewares/UploadAvatar.js';

export default ({ ProfileController }) => {
  const router = Router();

  router.get('/ver', authMiddleware, (req, res) => ProfileController.verPerfil(req, res));
  router.get('/buscar/:query', authMiddleware, (req, res) => ProfileController.searchUsers(req, res));

  router.post(
      '/avatar',
      authMiddleware,
      uploadAvatar.single("avatar"),
      validateAvatar,
      (req, res) => ProfileController.subirFotoDePerfil(req, res)
  );
  
  router.put('/', authMiddleware, (req, res) => ProfileController.actualizarPerfil(req, res));
  router.put('/password', authMiddleware, (req, res) => ProfileController.actualizarPassword(req, res));

  router.delete('/avatar', authMiddleware, (req, res) => ProfileController.deleteFotoDePerfil(req, res));
  router.delete('/', authMiddleware, (req, res) => ProfileController.deleteProfile(req, res));

  return router;
};