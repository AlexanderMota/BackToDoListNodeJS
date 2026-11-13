
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
}

export default MailService;





/*import nodemailer from 'nodemailer';

class MailService {
  constructor() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM
    } = process.env;

    if (!SMTP_HOST) {
      throw new Error('SMTP_HOST no está configurado');
    }

    const auth = SMTP_USER && SMTP_PASS
      ? {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      : undefined;

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === 'true',
      ...(auth && { auth })
    });

    this.from = SMTP_FROM || SMTP_USER || 'Soporte <no-reply@localhost>';
  }

  async verifyConnection() {
    return this.transporter.verify();
  }

  async sendPasswordResetEmail(to, resetUrl) {
    return this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Recuperación de contraseña',
      text: `Accede al siguiente enlace para restablecer tu contraseña: ${resetUrl}`,
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <a href="${resetUrl}">Restablecer contraseña</a>
        <p>Este enlace caduca en 30 minutos.</p>
        <p>Si no has solicitado recuperar tu contraseña, puedes ignorar este correo.</p>
      `
    });
  }
}

export default MailService;*/