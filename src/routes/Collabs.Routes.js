import { authMiddleware } from '../middlewares/AuthMiddleware.js';
import { Router } from 'express';

export default ({ CollaboratorsController }) => {
  const router = Router();

  router.get('/colaboradores/confirmados/:id', authMiddleware, (req, res) => CollaboratorsController.getCollabsConfirmed(req, res));
  router.get('/colaboradores/pendientes/:id', authMiddleware, (req, res) => CollaboratorsController.getCollabsPending(req, res));
  router.get('/invitacion/:id', authMiddleware, (req, res) => CollaboratorsController.getCollabRequestByIdTask(req, res));

  router.post('/colaboradores/:id', authMiddleware,(req, res) => CollaboratorsController.postCollabRequest(req, res));

  router.put('/colaboradores/:id', authMiddleware, (req, res) => CollaboratorsController.putCollabRequest(req, res));
  
  router.delete('/invitacion/:id', authMiddleware, (req, res) => CollaboratorsController.deleteCollabRequest(req, res));
  router.delete('/colaboradores/:id', authMiddleware, (req, res) => CollaboratorsController.deleteCollaboration(req, res));

  return router;
};