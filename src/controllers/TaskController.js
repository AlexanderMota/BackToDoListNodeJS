class TaskController {
  constructor({ TaskService }) {
    this.tareasService = TaskService;
  }

  createTarea = async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const { task } = req.body ?? {};

      if (
        !task ||
        typeof task !== 'object' ||
        Array.isArray(task)
      ) {
        return res.status(400).json({
          error: 'El formato de la tarea no es válido'
        });
      }

      const { name, description, priority, status, visibility, parent_task_id } = task;

      const nuevaTarea = await this.tareasService.createTarea({
        name,
        description,
        priority,
        status,
        visibility,
        parent_task_id,
        created_by: user.user_id
      });

      return res.status(201).json({
        message: 'Tarea creada exitosamente.',
        task: nuevaTarea
      });

    } catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };

  getParentTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const tasks = await this.tareasService.getParentTasksByUserID(user.user_id);
      
      res.json({ message: 'Tareas encontradas.', tasks });
    } catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  getSubTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;

      const tasks = await this.tareasService.getSubTasks(id, user.user_id);
      
      res.json({ message: 'Subtareas encontradas.', tasks });
    } catch (error) {
      if (error.message === 'Tarea no encontrada') {
        return res.status(404).json({ error: error.message });
      }

      if (error.message === 'No tienes permiso para acceder a esta tarea') {
        return res.status(403).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
  getTasksByCollaborating = async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });
      
      const tasks = await this.tareasService.getTasksByCollaborating(user.user_id);

      res.json({ message: 'Tareas encontradas.', tasks });

    }catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  getTasksByCollabRequest = async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const tasks = await this.tareasService.getTasksByCollabRequest(user.user_id);

      res.json({ message: 'Tareas encontradas.', tasks });


    }catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  getPublicTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const tasks = await this.tareasService.getPublicTasks(user.user_id);

      res.json({ message: 'Tareas encontradas.', tasks });
    } catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  getTareaById = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const { id } = req.params;
        const task = await this.tareasService.getTareaById(
            id,
            user.user_id
        );

        if (!task) {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        return res.json({
            message: 'Tarea encontrada',
            task
        });
    } catch (error) {
      if (error.message === 'Tarea no encontrada') {
        return res.status(404).json({
          error: 'Tarea no encontrada'
        });
      }

      if (error.message === 'No tienes permiso para acceder a esta tarea') {
        return res.status(403).json({
          error: error.message
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
  getPriorities = async (req, res) => {

    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });
      const priorities = await this.tareasService.getPriorities();
      res.json({ message: 'Prioridades encontradas.', priorities });
    } catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  getStatus = async (req, res) => {

    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });
      const status = await this.tareasService.getStatus();
      res.json({ message: 'Status encontrados.', status });
    } catch (error) {
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  updateTarea = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;

      const { task } = req.body ?? {};

      if (
        !task ||
        typeof task !== 'object' ||
        Array.isArray(task)
      ) {
        return res.status(400).json({
          error: 'El formato de la tarea no es válido'
        });
      }

      const tareaActualizada = await this.tareasService.updateTarea(id, { 
        name: task.name, 
        description: task.description, 
        status: task.status, 
        priority: task.priority, 
        visibility: task.visibility }, 
        user.user_id);

      if (!tareaActualizada) return res.status(404).json({ error: 'Tarea no encontrada o propietario incorrecto' });
      
      res.json({ message: 'Tarea actualizada exitosamente.', task: tareaActualizada });
    } catch (error) {

      return res.status(500).json({
          error: 'Error interno del servidor'
      });
    }
  }

  deleteTarea = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;
      const tareaEliminada = await this.tareasService.deleteTarea(id, user.user_id);

      if (!tareaEliminada) return res.status(404).json({ error: 'Tarea no encontrada o propietario incorrecto' });

      res.json({ message: 'Tarea eliminada exitosamente.', task: tareaEliminada });

    } catch (error) {

      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });

    }
  }
}

export default TaskController;
  