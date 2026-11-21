
class CollaboratorsRepository {
  constructor({ DBPool }) {
    this.DBPool = DBPool;
  }

  async findCollabsConfirmed(task_id){
    const [rows] = await this.DBPool.query(`
      SELECT 
        users.user_id, 
        users.avatar_url, 
        users.username, 
        requests_task.sender_user_id, 
        requests_task.request_id,
        requests_task.status
      FROM requests_task JOIN users
      ON   users.user_id = requests_task.user_id
      WHERE	task_id = ? AND status='accepted'
      `, [task_id]);

    return rows;
  }
  async findCollabsPending(task_id){
    const [rows] = await this.DBPool.query(`
      SELECT  
        users.user_id, 
        users.avatar_url, 
        users.username, 
        requests_task.sender_user_id, 
        requests_task.request_id,
        requests_task.status
      FROM requests_task JOIN users
      ON   users.user_id = requests_task.user_id
      WHERE	task_id = ? AND \`status\` = 'pending';
      `, [task_id]);
    return rows;
  }
  async findCollabRequestByTaskId(task_id,user_id){

    const [request_status] = await this.DBPool.query(`
      SELECT  
          requests_task.sender_user_id,
          requests_task.request_id,
          requests_task.task_id,
          requests_task.user_id,
          requests_task.status,
          requests_task.created_at,
          requests_task.updated_at,
          users.username,
          users.avatar_url,
          tasks.name,
          tasks.priority,
          tasks.status as 'tstatus'
      FROM  requests_task JOIN users
        ON  requests_task.user_id = users.user_id
      JOIN tasks
        ON  requests_task.task_id = tasks.task_id
      WHERE	requests_task.task_id = ? AND requests_task.user_id = ?
      `, [ task_id, user_id ]
    );

    return request_status.length ? request_status[0] : null;
  }

  async postCollabRequest(user_id, sender_user_id, task_id){

    const [rows] = await this.DBPool.query(`
      SELECT  *
      FROM requests_task
      WHERE	task_id = ? AND user_id = ? AND \`status\` = 'pending';
      `, [task_id, user_id]);

    if(rows.length > 0) throw new Error("Esta solicitud ya existe");

    const [result] = await this.DBPool.query(
      'INSERT INTO requests_task (user_id, sender_user_id, task_id) VALUES (?, ?, ?)',
      [user_id, sender_user_id, task_id]
    );
    
    return {request_id:result.insertId, sender_user_id:sender_user_id};
  }

  async putCollabRequest(request_id, user_id){

    const [rows] = await this.DBPool.query(`
      SELECT  *
      FROM requests_task
      WHERE	request_id = ?
      `, [request_id]);

    if(rows.length < 1) throw new Error("Esta colaboración no ha sido solicitada");
    
    if(user_id == rows[0].sender_user_id)
      throw new Error("El propietario de la tarea no puede añadir colaboradores de manera unilateral. Esperando la respuesta del usuario invitado.");
    else if(!rows[0].sender_user_id && user_id == rows[0].user_id)
      throw new Error("Los usuarios no pueden colaborar en tareas sin que el propietario de la tarea lo acepte. Esperando la respuesta del usuario propietario.");
    
    await this.DBPool.query(
      `
        UPDATE requests_task 
        SET 
          status = 'accepted' 
        WHERE request_id = ?
      `, [ rows[0].request_id ]
    );

    return await this.DBPool.query(
      'INSERT INTO user_tasks (user_id, task_id) VALUES (?, ?)',
      [rows[0].user_id, rows[0].task_id]
    );
  }
  
  async deleteCollabRequest(request_id,user_id){

    const [rows] = await this.DBPool.query(`
      DELETE FROM requests_task 
      WHERE request_id = ? AND (
        user_id = ? OR
        sender_user_id = ?
      )`, [request_id,user_id,user_id]);

    if(rows.affectedRows < 1) {
      throw new Error(
          "Esta colaboración no ha sido solicitada"
        );
    }

    return rows.affectedRows;
  }

  async deleteCollaboration(request_id, user_id){
    const [rows0] = await this.DBPool.query(`
      SELECT  colab.user_id, colab.task_id
      FROM user_tasks colab JOIN requests_task req
      ON   colab.user_id = req.user_id AND
           colab.task_id = req.task_id
      WHERE	request_id = ?
      `, [request_id]
    );

    if(!rows0.length) {
      throw new Error(
          `Hubo un error con la solicitud ${request_id} o con la colaboración asociada.`
        );
    }

    if(user_id != rows0[0].user_id){
      const [ownerRows] = await this.DBPool.query(`
          SELECT  1
          FROM  tasks
          WHERE created_by = ? AND task_id = ?
        `, [ user_id, rows0[0].task_id ]
      );
      if(!ownerRows.length){
        throw new Error(
          `Solo el creador de una tarea o el colaborador pueden eliminar una relación.`
        );
      }
    }

    await this.DBPool.query(`
      DELETE FROM user_tasks 
      WHERE user_id = ? AND task_id = ?`, [rows0[0].user_id,rows0[0].task_id]);

    await this.DBPool.query(`
      DELETE FROM requests_task 
      WHERE request_id = ?
    `, [request_id]);

    return true;
  }
}

export default CollaboratorsRepository;
