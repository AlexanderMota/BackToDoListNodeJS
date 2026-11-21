

class CollaboratorsService {

  constructor({ CollaboratorsRepository }) {
    this.collaboratorsRepository = CollaboratorsRepository;
  }

  async getCollabsConfirmed(task_id){
    return await this.collaboratorsRepository.findCollabsConfirmed(task_id);
  }
  async getCollabsPending(task_id){
    return await this.collaboratorsRepository.findCollabsPending(task_id);
  }
  async getCollabRequestByTaskId(task_id,user_id){
    return await this.collaboratorsRepository.findCollabRequestByTaskId(task_id,user_id);
  }
  async getCollabRequestsByUserId(user_id){
    return await this.collaboratorsRepository.findCollabRequestsByUserId(user_id);
  }

  async postCollabRequest(user_id, sender_user_id, task_id) {

    return await this.collaboratorsRepository.postCollabRequest(user_id, sender_user_id, task_id);
  }
  async putCollabRequest(request_id, user_id){
    return await this.collaboratorsRepository.putCollabRequest(request_id, user_id);

  }
  async deleteCollabRequest(request_id,user_id){
    return await this.collaboratorsRepository.deleteCollabRequest(request_id,user_id);

  }
  async deleteCollaboration(request_id,user_id){
    return await this.collaboratorsRepository.deleteCollaboration(request_id,user_id);
  }
}

export default CollaboratorsService;
