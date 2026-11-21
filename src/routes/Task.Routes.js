import { authMiddleware } from '../middlewares/AuthMiddleware.js';
import { Router } from 'express';

export default ({ TaskController, CommentsController }) => {
  const router = Router();

  router.get('/principales', authMiddleware, (req, res) => TaskController.getParentTasks(req, res));
  router.get('/derivadas/:id', authMiddleware, (req, res) => TaskController.getSubTasks(req, res));
  router.get('/colaborando', authMiddleware, (req, res) => TaskController.getTasksByCollaborating(req, res));
  router.get('/invitaciones', authMiddleware, (req, res) => TaskController.getTasksByCollabRequest(req, res));
  router.get('/publicas', authMiddleware, (req, res) => TaskController.getPublicTasks(req, res));
  router.get('/tarea/:id', authMiddleware, (req, res) => TaskController.getTareaById(req, res));
  router.get('/prioridades', authMiddleware, (req, res) => TaskController.getPriorities(req, res));
  router.get('/estatus', authMiddleware, (req, res) => TaskController.getStatus(req, res));
  router.get('/comentarios/:id', authMiddleware, (req, res) => CommentsController.getCommentsByIdTarea(req, res));

  router.post('/', authMiddleware, (req, res) => TaskController.createTarea(req, res));
  router.post('/comentarios/:id', authMiddleware, (req, res) => CommentsController.createComment(req, res));
  
  router.put('/tarea/:id', authMiddleware, (req, res) => TaskController.updateTarea(req, res));
  router.put('/comentarios/:id', authMiddleware, (req, res) => CommentsController.updateComment(req, res));

  router.delete('/tarea/:id', authMiddleware, (req, res) => TaskController.deleteTarea(req, res));
  router.delete('/comentarios/:id', authMiddleware, (req, res) => CommentsController.deleteComment(req, res));

  return router;
};