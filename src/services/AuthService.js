import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

class AuthService {
  constructor({ UserRepository, UserValidations, MailService }) {
    this.userRepository = UserRepository;
    this.userValidations = UserValidations;
    this.mailService = MailService;
  }

  async getMe(id) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error('Usuario no encontrado');
    return user;
  }
  async login(email, password) {
    let valid = false;

    valid = await this.userValidations.validateEmail(email);

    if (!valid) throw new Error('Formato email incorrecto');
    const user = await this.userRepository.findByEmail(email);

    if (!user) throw new Error('Usuario no encontrado');

    // MUY IMPORTANTE: Reactivar esta linea ya que es la que compara la contraseña introducida por el usuario con la contraseña hasheada que debe haber almacenada en la base de datos. Desactivamos solo para pruebas.
    //if (!this.userValidations.validateComparePassword(password, user.password)) throw new Error('Contraseña incorrecta');
    //if (user.password.startsWith('$2b$')) 
      valid = await bcrypt.compare(password, user.password);
    //else valid = password === user.password;
    

    if (!valid) throw new Error('Contraseña incorrecta');

    // Generar JWT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    return token;
  }

  async forgotPassword(email) {
    const valid = await this.userValidations.validateEmail(email);

    if (!valid) {
      throw new Error('Formato email incorrecto');
    }

    const user = await this.userRepository.findByEmail(email);

    // No revelamos si el correo está registrado.
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.userRepository.deleteUserTokens(user.user_id);

    await this.userRepository.createToken(
      user.user_id,
      tokenHash,
      expiresAt
    );

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        resetUrl
      );
    } catch (error) {
      await this.userRepository.deleteToken(tokenHash);
      throw error;
    }
  }
  async resetPassword(token, password) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token de recuperación inválido');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const resetRequest = await this.userRepository.findValidToken(tokenHash);

    if (!resetRequest) {
      throw new Error('El enlace de recuperación no es válido o ha caducado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await this.userRepository.updatePasswordByUserId(
      resetRequest.user_id,
      hashedPassword
    );

    if (!updated) {
      throw new Error('No se pudo actualizar la contraseña');
    }

    await this.userRepository.deleteUserTokens(resetRequest.user_id);
  }
}

export default AuthService;