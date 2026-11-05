class TasksService {
  constructor({ TaskRepository }) {
    this.taskRepository = TaskRepository;
  }
  async createTarea(task) {
    return await this.taskRepository.create(task);
  }
  async getTareaById(task_id, user_id) {
    return await this.taskRepository.findById(task_id, user_id);
  }
  async getParentTasksByUserID(user_id) {
    return await this.taskRepository.findParentTasksByUserID(user_id);
  }
  async getSubTasks(parent_task_id, user_id) {
    return await this.taskRepository.findSubTasks(parent_task_id, user_id);
  }
  async getTasksByCollaborating(user_id){
    return await this.taskRepository.findTasksByCollaborating(user_id);
  }
  async getTasksByCollabRequest(user_id){
    return await this.taskRepository.findTasksByCollabRequest(user_id);
  }
  async getPublicTasks(user_id){
    return await this.taskRepository.findPublicTasks(user_id);
  }
  async getPriorities() {
    return await this.taskRepository.findPriorities();
  }
  async getStatus() {
    return await this.taskRepository.findStatus();
  }
  async updateTarea(id, tarea, user_id) {
    return await this.taskRepository.update(id, tarea, user_id);
  }
  async deleteTarea(id, user_id) {
    return await this.taskRepository.delete(id, user_id);
  }
}

export default TasksService;
