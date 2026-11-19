import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

class AuthService {
  constructor({ UserRepository, UserValidations, MailService }) {
    this.userRepository = UserRepository;
    this.userValidations = UserValidations;
    this.mailService = MailService;
  }
  async sendVerificationEmail(user) {

    if (user.email_verified) {
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userRepository.deleteVerificationToken(user.user_id);

    await this.userRepository.createVerificationToken(
      user.user_id,
      tokenHash,
      expiresAt
    );

    const verificationUrl =
      `${process.env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        verificationUrl
      );
    } catch (error) {
      await this.userRepository.deleteVerificationToken(tokenHash);
      throw error;
    }
  }
  async verifyEmail(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token de verificación inválido');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const verification = await this.userRepository.findValidVerificationToken(
      tokenHash
    );

    if (!verification) {
      throw new Error('El enlace de verificación no es válido o ha caducado');
    }

    const verified = await this.userRepository.verifyUserEmail(
      verification.user_id
    );

    if (!verified) {
      throw new Error('No se pudo verificar el correo electrónico');
    }

    await this.userRepository.deleteVerificationToken(
      verification.user_id
    );
  }
  async resendVerificationEmail(email) {
    const valid = await this.userValidations.validateEmail(email);

    if (!valid) {
      throw new Error('Formato email incorrecto.');
    }

    const user = await this.userRepository.findByEmail(email);

    // No revelamos si el correo existe o está verificado.
    if (!user || user.email_verified) {
      return;
    }

    await this.sendVerificationEmail(user);
  }
  async getMe(id) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error('Usuario no encontrado');
    return user;
  }
  async login(email, password) {
    const validEmail = await this.userValidations.validateEmail(email);

    if (!validEmail) {
      throw new Error('Formato email incorrecto');
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error('Contraseña incorrecta');
    }

    // Comprobar que el correo está verificado
    if (!user.email_verified) {
      throw new Error('Correo electrónico no verificado');
    }

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
      throw new Error('Formato email incorrecto.');
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