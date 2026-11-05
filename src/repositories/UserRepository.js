class UserRepository {
  constructor({ DBPool }) {
    this.DBPool = DBPool;
  }

  async register(user) {
    const [result] = await this.DBPool.query(`
      INSERT INTO users (
        user_id, 
        name, 
        lastname, 
        username, 
        email, 
        phone, 
        password, 
        role_id ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.user_id,
        user.name,
        user.lastname,
        user.username,
        user.email,
        user.phone,
        user.password,
        5
      ]
    );
    return user;
  }

  async findByEmail(email) {
    const [rows] = await this.DBPool.query(`
      SELECT 
        user_id, 
        name, 
        lastname, 
        username, 
        email, 
        password,
        phone, 
        avatar_url, 
        role 
      FROM users 
      JOIN roles 
      ON users.role_id = roles.role_id 
      WHERE email = ?
      `, 
      [email]
    );
    return rows.length ? rows[0] : null;
  }
  async findById(id) {
    const [rows] = await this.DBPool.query( `
        SELECT 
          user_id, 
          name, 
          lastname, 
          username, 
          email, 
          password,
          phone, 
          avatar_url, 
          role 
        FROM users
        JOIN roles
        ON users.role_id = roles.role_id 
        WHERE user_id = ?
      `, 
      [id]
    );
    return rows.length ? rows[0] : null;
  }
  async searchUsers(query, user_id, task_id) {

    const [rows] = await this.DBPool.query(`
      SELECT
        u.user_id,
        u.username,
        u.avatar_url
      FROM users u
      WHERE
        u.user_id <> ?
        AND NOT EXISTS (
            SELECT 1
            FROM user_tasks ut
            WHERE ut.user_id = u.user_id
              AND ut.task_id = ?
        )
        AND NOT EXISTS (
            SELECT 1
            FROM requests_task rt
            WHERE rt.user_id = u.user_id
              AND rt.task_id = ?
              AND rt.status = 'pending'
        )
        AND (
            u.username LIKE ?
            OR u.name LIKE ?
            OR u.lastname LIKE ?
            OR u.email LIKE ?
        )
      LIMIT 10
      `, [
        user_id, 
        task_id,
        task_id,
        `%${query}%`, 
        `%${query}%`,
        `%${query}%`, 
        `%${query}%`
      ]
    );

    return rows;
  }
  
  async updateAvatar(user_id, avatar_url) {

    const [result] = await this.DBPool.query(`
      UPDATE users 
      SET avatar_url = ? 
      WHERE user_id = ?
    `, 
      [ avatar_url, user_id ]
    );

    return result.affectedRows > 0;
  }
  async updateProfile(user_id, profile) {

    const { name, lastname, username, phone } = profile;

    const [result] = await this.DBPool.query(
        `
            UPDATE users
            SET
                name = ?,
                lastname = ?,
                username = ?,
                phone = ?,
                updated_at = NOW()
            WHERE user_id = ?
        `,
        [
            name,
            lastname,
            username,
            phone,
            user_id
        ]
    );

    if (result.affectedRows > 0) {
        return profile;
    }

    const [rows] = await this.DBPool.query(
        `SELECT user_id FROM users WHERE user_id = ?`,
        [user_id]
    );

    return rows.length > 0 ? profile : null;
  }

  async updatePassword( user_id, currentPassword, newPassword ){

    const [result] = await this.DBPool.query(
      `
        UPDATE users 
        SET 
          password = ?,
          updated_at = NOW() 
        WHERE user_id = ? AND password = ?
      `, [
        newPassword,
        user_id,
        currentPassword
      ]
    );
    return result.affectedRows > 0;


  }

  async delete(user_id) {
    const [result] = await this.DBPool.query(
      'DELETE FROM users WHERE user_id = ?', 
      [user_id]
    );
    return result.affectedRows > 0;
  }
}

export default UserRepository;
