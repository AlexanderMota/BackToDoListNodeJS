class TaskController {
  constructor({ TaskService }) {
    this.tareasService = TaskService;
  }

  createTarea = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });
      const {task} = req.body;
      task.created_by = user.user_id;
      const nuevaTarea = await this.tareasService.createTarea(task);

      res.status(201).json({ message: 'Tarea creada exitosamente.', task: nuevaTarea });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  getParentTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      const tasks = await this.tareasService.getParentTasksByUserID(user.user_id);
      
      res.json({ message: 'Tareas encontradas.', tasks });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
  getSubTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;

      const tasks = await this.tareasService.getSubTasks(id);
      
      res.json({ message: 'Subtareas encontradas.', tasks });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
  getTasksByCollaborating = async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      
      const tasks = await this.tareasService.getTasksByCollaborating(user.user_id);

      if (!tasks) return res.status(404).json({ error: 'Tareas no encontradas' });

      res.json({ message: 'Tareas encontradas.', tasks });


    }catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  getTasksByCollabRequest = async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      
      const tasks = await this.tareasService.getTasksByCollabRequest(user.user_id);

      if (!tasks) return res.status(404).json({ error: 'Tareas no encontradas' });

      res.json({ message: 'Tareas encontradas.', tasks });


    }catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  getPublicTasks = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      const tasks = await this.tareasService.getPublicTasks(user.user_id);

      if (!tasks) return res.status(404).json({ error: 'Tareas no encontradas' });

      res.json({ message: 'Tareas encontradas.', tasks });
    } catch (error) {
      res.status(400).json({ error: error.message });
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
            message: 'Tarea encontrada.',
            task
        });
    } catch (error) {
        if (error.message === 'Tarea no encontrada') {
            return res.status(404).json({
                error: 'Tarea no encontrada'
            });
        }

        console.error('Error en getTareaById:', error);

        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
  };
  getPriorities = async (req, res) => {

    try {
      const user = req.user;
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });
      const priorities = await this.tareasService.getPriorities();
      res.json({ message: 'Prioridades encontradas.', priorities });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
  getStatus = async (req, res) => {

    try {
      const user = req.user;
      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });
      const status = await this.tareasService.getStatus();
      res.json({ message: 'Status encontrados.', status });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  updateTarea = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;
      const {task} = req.body;

      const tareaActualizada = await this.tareasService.updateTarea(id, task, user.user_id);

      if (!tareaActualizada) return res.status(404).json({ error: 'Tarea no encontrada o propietario incorrecto' });
      
      res.json({ message: 'Tarea actualizada exitosamente.', task: tareaActualizada });
    } catch (error) {
      //res.status(400).json({ error: error.message });
      if (error.message === 'Tarea no encontrada o propietario incorrecto') {
          return res.status(404).json({
              error: 'Tarea no encontrada o propietario incorrecto'
          });
      }

      return res.status(500).json({
          error: 'Error interno del servidor'
      });
    }
  }

  deleteTarea = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(400).json({ error: 'Usuario no autenticado' });

      const { id } = req.params;
      const tareaEliminada = await this.tareasService.deleteTarea(id, user.user_id);

      if (!tareaEliminada) return res.status(404).json({ error: 'Tarea no encontrada o propietario incorrecto' });

      res.json({ message: 'Tarea eliminada exitosamente.', task: tareaEliminada });

    } catch (error) {

      res.status(400).json({ error: error.message });

    }
  }
}

export default TaskController;
  