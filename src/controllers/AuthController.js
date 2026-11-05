class AuthController {
  
  constructor({ AuthService, ProfileService }) {
    this.authService = AuthService;
    this.perfilService = ProfileService;
  }

  createProfile = async (req, res) => {
    try {
      if (!req.body?.user || typeof req.body.user !== 'object') {
        return res.status(400).json({
          error: 'Los datos del usuario son requeridos'
        });
      }
      const { user } = req.body;
      const newUser = await this.perfilService.createProfile(user);

      res.status(201).json({ message: 'Perfil creado.', user: newUser });
    } catch (error) {

      //console.error('Error en createTarea:', error);

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

      //console.error('Error en createTarea:', error);
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

      if (error.message === "Contraseña incorrecta") {
        return res.status(401).json({
          error: 'Credenciales incorrectas'
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
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
}

export default AuthController;
  