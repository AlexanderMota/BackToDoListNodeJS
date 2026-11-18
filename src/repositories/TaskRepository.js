
class TaskRepository {
  constructor({ DBPool }) {
    this.DBPool = DBPool;
  }

  async create(tarea) {
    const { name, description, status, priority, parent_task_id, created_by, visibility } = tarea;

    const [result] = await this.DBPool.query(`
      INSERT INTO tasks (
        name, 
        description, 
        status, 
        priority, 
        parent_task_id, 
        created_by,
        visibility
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        name, 
        description, 
        status, 
        priority, 
        parent_task_id, 
        created_by,
        visibility
      ]
    );
    return { task_id: result.insertId, ...tarea };
  }
  
  async findParentTasksByUserID(user_id) {
    const [rows] = await this.DBPool.query(`
      SELECT * 
      FROM tasks 
      WHERE parent_task_id is null and created_by = ?`
      , [user_id]
    );
   
    return rows;
  }
  async findSubTasks(parent_task_id, user_id) {
    const parentTask = await this.findById(parent_task_id, user_id);
    const isOwner = parentTask.created_by === user_id;

    const [collaborators] = await this.DBPool.query(`
      SELECT 1
      FROM user_tasks
      WHERE task_id = ?
        AND user_id = ?
      LIMIT 1
    `, [parent_task_id, user_id]);

    const isCollaborator = collaborators.length > 0;

    const [rows] = await this.DBPool.query(`
      SELECT
        t.*,

        rt.request_id AS request_id,
        rt.task_id AS request_task_id,
        rt.user_id AS request_user_id,
        rt.sender_user_id AS request_sender_user_id,
        rt.status AS request_status,
        rt.created_at AS request_created_at,
        rt.updated_at AS request_updated_at

      FROM tasks t

      LEFT JOIN requests_task rt
        ON rt.task_id = t.task_id
        AND rt.user_id = ?
        AND rt.status = 'pending'

      WHERE t.parent_task_id = ?
        AND (
          ? = 1

          OR (
            t.visibility = 'public'
            AND ? = 1
          )

          OR EXISTS (
            SELECT 1
            FROM user_tasks ut
            WHERE ut.task_id = t.task_id
              AND ut.user_id = ?
          )

          OR rt.request_id IS NOT NULL
        )
    `, [
      user_id,
      parent_task_id,
      isOwner ? 1 : 0,
      isCollaborator ? 1 : 0,
      user_id
    ]);

    return rows.map(row => {
      const {
        request_id,
        request_task_id,
        request_user_id,
        request_sender_user_id,
        request_status,
        request_created_at,
        request_updated_at,
        ...task
      } = row;

      return {
        ...task,
        request_task: request_id == null
          ? null
          : {
              request_id,
              task_id: request_task_id,
              user_id: request_user_id,
              sender_user_id: request_sender_user_id,
              status: request_status,
              created_at: request_created_at,
              updated_at: request_updated_at
            }
      };
    });
  }
  async findPublicTasks(user_id) {
    const [rows] = await this.DBPool.query(`
      SELECT *
      FROM tasks
      WHERE visibility = 'public' 
        AND parent_task_id IS NULL
        AND created_by <> ? 
        AND NOT EXISTS (
          SELECT 1
          FROM requests_task rt 
          WHERE rt.task_id = tasks.task_id
            AND rt.user_id = ?
            AND rt.status IN ('pending', 'accepted')
        )`, [user_id, user_id]
    );
    return rows;
  }
  async findTasksByCollaborating(user_id) {
    const [rows] = await this.DBPool.query(`
      WITH RECURSIVE

      -- Tareas en las que colaboramos directamente.
      collaborating_tasks AS (
        SELECT DISTINCT
          t.task_id,
          t.parent_task_id
        FROM tasks t
        JOIN user_tasks ut
          ON ut.task_id = t.task_id
        WHERE ut.user_id = ?
      ),

      -- Antepasados de cada tarea colaborada.
      task_ancestors (task_id, ancestor_id) AS (

        SELECT
          ct.task_id,
          ct.parent_task_id
        FROM collaborating_tasks ct
        WHERE ct.parent_task_id IS NOT NULL

        UNION DISTINCT

        SELECT
          ta.task_id,
          parent.parent_task_id
        FROM task_ancestors ta
        JOIN tasks parent
          ON parent.task_id = ta.ancestor_id
        WHERE parent.parent_task_id IS NOT NULL
      )

      SELECT t.*
      FROM collaborating_tasks ct
      JOIN tasks t
        ON t.task_id = ct.task_id

      WHERE NOT EXISTS (

        SELECT 1
        FROM task_ancestors ta
        JOIN collaborating_tasks ancestor
          ON ancestor.task_id = ta.ancestor_id

        WHERE ta.task_id = ct.task_id

      )

    `, [user_id]);

    return rows;
  }
  async findTasksByCollabRequest(user_id) {
    const [rows] = await this.DBPool.query(`
      SELECT
        tasks.*,

        requests_task.request_id AS request_id,
        requests_task.task_id AS request_task_id,
        requests_task.user_id AS request_user_id,
        requests_task.sender_user_id AS request_sender_user_id,
        requests_task.status AS request_status,
        requests_task.created_at AS request_created_at,
        requests_task.updated_at AS request_updated_at

      FROM tasks
      JOIN requests_task
        ON tasks.task_id = requests_task.task_id

      WHERE requests_task.status = 'pending'
        AND (

          -- 1. Invitación recibida en una tarea ajena.
          (
            requests_task.user_id = ?
            AND requests_task.sender_user_id = tasks.created_by
            AND tasks.created_by <> ?
          )

          OR

          -- 2. Solicitud recibida en una tarea propia.
          (
            tasks.created_by = ?
            AND requests_task.sender_user_id IS NULL
            AND requests_task.user_id <> ?
          )

          OR

          -- 3. Solicitud de colaboración enviada por nosotros.
          (
            requests_task.user_id = ?
            AND requests_task.sender_user_id IS NULL
            AND tasks.created_by <> ?
          )

          OR

          -- 4. Invitación enviada por nosotros.
          (
            tasks.created_by = ?
            AND requests_task.sender_user_id = ?
            AND requests_task.user_id <> ?
          )

        )
    `, [
      user_id, user_id,
      user_id, user_id,
      user_id, user_id,
      user_id, user_id, user_id
    ]);

    return rows.map(row => {
      const {
        request_id,
        request_task_id,
        request_user_id,
        request_sender_user_id,
        request_status,
        request_created_at,
        request_updated_at,
        ...task
      } = row;

      return {
        ...task,
        request_task: {
          request_id,
          task_id: request_task_id,
          user_id: request_user_id,
          sender_user_id: request_sender_user_id,
          status: request_status,
          created_at: request_created_at,
          updated_at: request_updated_at
        }
      };
    });
  }
    async findById(task_id, user_id) {
    const [rows] = await this.DBPool.query(`
      SELECT
        t.*,
        u.username,
        u.avatar_url
      FROM tasks t
      JOIN users u ON u.user_id = t.created_by
      WHERE t.task_id = ?
        AND (
          t.created_by = ?
          OR EXISTS (
            SELECT 1
            FROM user_tasks ut
            WHERE ut.task_id = t.task_id
              AND ut.user_id = ?
          )
          OR (
            t.parent_task_id IS NULL
            AND t.visibility = 'public'
          )
          OR EXISTS (
            SELECT 1
            FROM user_tasks ut
            JOIN tasks parent
              ON parent.task_id = t.parent_task_id
            WHERE ut.task_id = parent.task_id
              AND ut.user_id = ?
              AND t.visibility = 'public'
          )
        )
    `, [task_id, user_id, user_id, user_id]);

    if (rows.length) return rows[0];

    const [taskExists] = await this.DBPool.query(
      'SELECT task_id FROM tasks WHERE task_id = ?',
      [task_id]
    );

    if (!taskExists.length) {
      throw new Error('Tarea no encontrada');
    }

    throw new Error('No tienes permiso para acceder a esta tarea');
  }
  async findPriorities() {
    const [rows] = await this.DBPool.query("SHOW COLUMNS FROM tasks LIKE 'priority'");
    
    const enumValues = rows[0].Type
      .match(/enum\((.*)\)/)[1]
      .replace(/'/g, '')
      .split(',');
    
    return enumValues;
  }
  async findStatus() {
    const [rows] = await this.DBPool.query("SHOW COLUMNS FROM tasks LIKE 'status'");
    
    const enumValues = rows[0].Type
      .match(/enum\((.*)\)/)[1]
      .replace(/'/g, '')
      .split(',');
    
    return enumValues;
  }

  async update(id, tarea, user_id) {
    const { name, description, status, priority, visibility } = tarea;
    const [result] = await this.DBPool.query(`
        UPDATE tasks 
        SET 
          name = ?, 
          description = ?, 
          status = ?, 
          priority = ?, 
          visibility = ?,
          updated_at = NOW() 
        WHERE task_id = ? AND created_by = ?
      `,
      [ 
        name, 
        description, 
        status, 
        priority,
        visibility, 
        id, 
        user_id 
      ]
    );
    return result.affectedRows > 0 ? { task_id: id, ...tarea } : null;
  }

  async delete(id, user_id) {
    const [result] = await this.DBPool.query('DELETE FROM tasks WHERE task_id = ? and created_by = ?', [id, user_id]);
    return result.affectedRows > 0;
  }
}

export default TaskRepository;

