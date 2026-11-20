
import nodemailer from 'nodemailer';

class MailService {
  constructor() {
    this.transporterPromise = null;
    this.testAccount = null;
  }

  async createTransporter() {
    if (process.env.ENVIRONMENT === 'development') {
      // Crear una cuenta SMTP temporal de Ethereal.
      this.testAccount = await nodemailer.createTestAccount();

      return nodemailer.createTransport({
        host: this.testAccount.smtp.host,
        port: this.testAccount.smtp.port,
        secure: this.testAccount.smtp.secure,
        auth: {
          user: this.testAccount.user,
          pass: this.testAccount.pass
        }
      });
    }

    // Configuración SMTP para producción.
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      throw new Error('Configuración SMTP incompleta');
    }

    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  async getTransporter() {
    if (!this.transporterPromise) {
      this.transporterPromise = this.createTransporter()
        .catch(error => {
          this.transporterPromise = null;
          throw error;
        });
    }

    return this.transporterPromise;
  }

  async verifyConnection() {
    const transporter = await this.getTransporter();
    return transporter.verify();
  }

  async sendPasswordResetEmail(to, resetUrl) {
    const transporter = await this.getTransporter();

    const from = this.testAccount
      ? `"Soporte" <${this.testAccount.user}>`
      : process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Recuperación de contraseña',
      text: `Accede al siguiente enlace para restablecer tu contraseña: ${resetUrl}`,
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}">Restablecer contraseña</a>
        <p>Este enlace caduca en 30 minutos.</p>
        <p>Si no has solicitado recuperar tu contraseña, ignora este correo.</p>
      `
    });

    if (this.testAccount) {
      console.log(
        'Vista previa del correo:',
        nodemailer.getTestMessageUrl(info)
      );
    }

    return info;
  }
  async sendVerificationEmail(to, verificationUrl) {
    const transporter = await this.getTransporter();

    const from = this.testAccount
      ? `"Soporte" <${this.testAccount.user}>`
      : process.env.SMTP_FROM || process.env.SMTP_USER;

    const info = await transporter.sendMail({
      from,
      to,
      subject: 'Verifica tu correo electrónico',
      text: `Accede al siguiente enlace para verificar tu correo electrónico: ${verificationUrl}`,
      html: `
        <h2>Verificación de correo electrónico</h2>
        <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
        <a href="${verificationUrl}">Verificar correo electrónico</a>
        <p>Este enlace caduca en 24 horas.</p>
        <p>Si no has creado esta cuenta, ignora este correo.</p>
      `
    });

    if (this.testAccount) {
      console.log(
        'Vista previa del correo:',
        nodemailer.getTestMessageUrl(info)
      );
    }

    return info;
  }
}

export default MailService;