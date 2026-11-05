class ProfileController {
  constructor({ ProfileService }) {
    this.profileService = ProfileService;
  }

  searchUsers = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const { query } = req.params;
        const taskId = Number(req.query.task_id);

        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({
                error: 'El parámetro de búsqueda no puede estar vacío'
            });
        }

        if (!Number.isInteger(taskId) || taskId <= 0) {
            return res.status(400).json({
                error: 'El parámetro task_id no es válido'
            });
        }

        const usersResult = await this.profileService.searchUsers(
            query.trim(),
            user.user_id,
            taskId
        );

        return res.json({
            message: `Perfiles encontrados (${usersResult.length})`,
            users: usersResult
        });

    } catch (error) {
        console.error('Error en searchUsers:', error);

        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
  };
  subirFotoDePerfil = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });
      
      if (!req.file) {
          return res.status(400).json({
              error: 'Debes seleccionar una imagen'
          });
      }

      const avatar_url = req.file.filename;

      const profileservresp = await this.profileService.updateAvatar( user.user_id, avatar_url );
      
      if(!profileservresp) throw new Error("Error al actualizar el avatar");
      
      res.json({
          message: "Avatar actualizado",
          user: {
            avatar_url: req.file.filename
          }
      });
      
    } catch (error) {

      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });

    }
  }

  verPerfil = async (req, res) => {

    try {
      const user = req.user;

      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const profile = await this.profileService.getUserById(user.user_id);

      res.json({message: 'Perfil encontrado', user: profile});

    } catch (error) {

      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });

    }
  }
  actualizarPerfil = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const { perfil } = req.body ?? {};

        // Comprobar que perfil sea un objeto válido.
        if (
            !perfil ||
            typeof perfil !== 'object' ||
            Array.isArray(perfil)
        ) {
            return res.status(400).json({
                error: 'Los datos del perfil son requeridos'
            });
        }

        // Campos que se permite modificar.
        const allowedFields = ['name', 'lastname', 'username', 'phone'];

        // Rechazar campos que no estén permitidos.
        const receivedFields = Object.keys(perfil);
        const invalidFields = receivedFields.filter(
            field => !allowedFields.includes(field)
        );

        if (invalidFields.length > 0) {
            return res.status(400).json({
                error: 'El perfil contiene campos no permitidos',
                fields: invalidFields
            });
        }

        // Exigir los cuatro campos que actualiza el repositorio.
        if (!allowedFields.every(field => Object.hasOwn(perfil, field))) {
            return res.status(400).json({
                error: 'Debes proporcionar todos los campos del perfil'
            });
        }

        // Validar los tipos de los campos.
        if (
            typeof perfil.username !== 'string' ||
            !perfil.username.trim() ||
            ![perfil.name, perfil.lastname, perfil.phone].every(
                value => value === null || typeof value === 'string'
            )
        ) {
            return res.status(400).json({
                error: 'Los datos del perfil tienen un formato incorrecto'
            });
        }

        const profileAct = await this.profileService.actualizarPerfil(
            user.user_id,
            perfil
        );

        if (!profileAct) {
            return res.status(404).json({
                error: 'No se encontró el perfil que se intenta actualizar'
            });
        }

        return res.json({
            message: 'Perfil actualizado',
            user: profileAct
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
  };
  actualizarPassword = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      if (
          !req.body?.password ||
          typeof req.body.password.currentPassword !== 'string' ||
          typeof req.body.password.newPassword !== 'string' ||
          !req.body.password.currentPassword ||
          !req.body.password.newPassword
      ) {
          return res.status(400).json({
              error: 'Debes proporcionar la contraseña actual y la nueva'
          });
      }

      const { password } = req.body;

      if (password.newPassword === password.currentPassword) {
          return res.status(400).json({
              error: 'La nueva contraseña es igual que la anterior'
          });
      }

      const profileAct = await this.profileService.actualizarPassword(user.user_id,  password.currentPassword, password.newPassword);

      if(!profileAct)
        return res.status(400).json({
          error: 'Tuvimos un problema al intentar actualizar la contraseña. Verifica que la contraseña actual sea correcta'
        });

      res.json({message: 'Perfil actualizado.', user: user});

    } catch (error){
      //console.error('Error en createTarea:', error);
      if(error.message === "Contraseña incorrecta") { 
        return res.status(400).json({
          error: 'Contraseña incorrecta'
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  deleteFotoDePerfil = async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuario no autenticado'
        });
      }

      const profileAct = await this.profileService.deleteAvatar(req.user.user_id);

      if (!profileAct) {
        return res.status(500).json({
          error: 'Error interno del servidor'
        });
      }

      return res.status(200).json({
        message: 'Perfil actualizado.',
        user: { avatar_url: null }
      });

    } catch (error) {
      if (error.message === 'El usuario no tiene avatar') {
        return res.status(404).json({
          error: 'El usuario no tiene avatar'
        });
      }

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
 
  deleteProfile = async (req, res) => {

    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        const deleted = await this.profileService.deleteProfile(user.user_id);

        if (!deleted) {
            return res.status(404).json({
                error: 'No se encontró el perfil que se intenta eliminar'
            });
        }

        res.clearCookie('access_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        return res.json({
            message: 'Perfil eliminado.',
            user: {}
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error interno del servidor'
        });
    }
  };
}


export default ProfileController;
  