class AuthController {
  
  constructor({ AuthService, ProfileService }) {
    this.authService = AuthService;
    this.perfilService = ProfileService;
  }

  createProfile = async (req, res) => {
    try {
      if (
        !req.body?.user ||
        typeof req.body.user !== 'object' ||
        Array.isArray(req.body.user)
      ) {
        return res.status(400).json({
          error: 'Los datos del usuario son requeridos'
        });
      }

      const { user } = req.body;

      const newUser = await this.perfilService.createProfile(user);

      let emailSent = false;

      try {
        await this.authService.sendVerificationEmail(newUser);
        emailSent = true;
      } catch (error) {
        console.error('Error enviando correo de verificación:', error);
      }

      return res.status(201).json({
        message: emailSent
          ? 'Perfil creado. Revisa tu correo electrónico para verificar tu cuenta.'
          : 'Perfil creado, pero no se pudo enviar el correo de verificación. Solicita un nuevo enlace.',
        emailSent,
        user: newUser
      });

    } catch (error) {
      
      //console.error('Error creando perfil:', error);
      if (error.sqlMessage === 'Column \'username\' cannot be null') {
        return res.status(400).json({
          error: 'Debe indicar un nick para la cuenta.'
        });
      }
      if (error.code === 'ER_DUP_ENTRY') {
        if(error.sqlMessage?.includes('users.username_UNIQUE')){
          return res.status(400).json({
            error: 'Este nickname ya se encuentra registrado en la aplicación.'
          });
        }
        return res.status(400).json({
          error: 'Este email ya se encuentra registrado en la aplicación.'
        });
      }

      if (error.message === 'Formato email incorrecto.') {
        return res.status(404).json({
          error: error.message
        });
      }


      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
  verifyEmail = async (req, res) => {

    try {
      const { token } = req.body ?? {};

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          error: 'Debes proporcionar un token de verificación válido.'
        });
      }

      await this.authService.verifyEmail(token);

      return res.status(200).json({
        message: 'Correo electrónico verificado correctamente.',
        user:{}
      });

    } catch (error) {

      if (
        error.message === 'Token de verificación inválido' ||
        error.message === 'El enlace de verificación no es válido o ha caducado' ||
        error.message === 'No se pudo verificar el correo electrónico'
      ) {
        return res.status(400).json({
          error: error.message
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
  resendVerificationEmail = async (req, res) => {
    try {
      const { email } = req.body ?? {};

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          error: 'Debes proporcionar un correo electrónico válido'
        });
      }

      await this.authService.resendVerificationEmail(email);

      return res.status(200).json({
        message: 'Si existe una cuenta pendiente de verificación con ese correo, recibirás un nuevo enlace.',
        user:{}
      });

    } catch (error) {
      if (error.message === 'Formato email incorrecto.') {
        return res.status(400).json({
          error: error.message
        });
      }
      //console.error('Error reenviando verificación:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };

  getMe = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const userData = await this.authService.getMe(user.user_id);
      
      res.json({message: 'Usuario activo.', user: { 
        user_id : userData.user_id,
        name: userData.name,
        lastname: userData.lastname,
        username: userData.username, 
        email: userData.email,
        phone: userData.phone,
        avatar_url: userData.avatar_url,
        role: user.role }});
    } catch (error) {

      if (error.message === "Usuario no encontrado") {
        return res.status(404).json({
          error: 'Usuario no encontrado'
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
      });

    }
  }
  login = async (req, res) => {
    try {
      const { user } = req.body;

      if (!user || !user.email || !user.password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

      const token = await this.authService.login(user.email, user.password);
      let maxAge = 0;
      if (user.rememberMe) maxAge = 30 * 24 * 60 * 60 * 1000;
      else maxAge = 60 * 60 * 1000;
      
      res.cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',    // true en producción (HTTPS)
        sameSite: 'lax',
        maxAge: maxAge
      });

      res.json({message: 'Login exitoso.', user: {email:user.email}});

    } catch (error) {

      if (error.message === 'Correo electrónico no verificado') {
        return res.status(403).json({
          error: 'Debes verificar tu correo electrónico antes de iniciar sesión.'
        });
      }

      if (
        error.message === 'Contraseña incorrecta' ||
        error.message === 'Usuario no encontrado'
      ) {
        return res.status(401).json({
          error: 'Credenciales incorrectas.'
        });
      }

      if (error.message === 'Formato email incorrecto') {
        return res.status(400).json({
          error: 'Formato de correo electrónico incorrecto.'
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor.'
      });
    }
  }
  logout = async (req, res) => {
    try {
        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        return res.json({
            message: 'Logout exitoso.',
            user: {}
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
  }

  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body ?? {};

      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          error: 'Debes proporcionar un correo electrónico válido.'
        });
      }

      await this.authService.forgotPassword(email);

      return res.status(200).json({
        message: 'Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.',
        user: {}
      });

    } catch (error) {
      if (error.message === 'Debes proporcionar un correo electrónico válido.' || 'Formato email incorrecto.') {
        return res.status(400).json({
          error: error.message
        });
      }
      return res.status(500).json({
        error: 'Error interno del servidor.'
      });
    }
  };
  resetPassword = async (req, res) => {
    try {
      const { token, password } = req.body ?? {};

      if (!token || typeof token !== 'string') {
        return res.status(400).json({
          error: 'El token de recuperación no es válido.'
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'Debes proporcionar una contraseña válida.'
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 8 caracteres.'
        });
      }

      await this.authService.resetPassword(token, password);

      return res.status(200).json({
        message: 'Contraseña actualizada correctamente.',
        user: {}
      });

    } catch (error) {
      console.error('Error en resetPassword:', error);

      if (
        error.message === 'El enlace de recuperación no es válido o ha caducado.' ||
        error.message === 'Token de recuperación inválido.'
      ) {
        return res.status(400).json({
          error: error.message
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor.'
      });
    }
  };
}

export default AuthController;
  