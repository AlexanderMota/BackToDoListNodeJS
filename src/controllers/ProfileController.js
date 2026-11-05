class ProfileController {
  constructor({ ProfileService }) {
    this.profileService = ProfileService;
  }

  searchUsers = async (req, res) => {
    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { query } = req.params;
      const { task_id } = req.query;

      const usersResult = await this.profileService.searchUsers( query, user.user_id, task_id );

      res.json({message: `Perfiles encontrados (${usersResult.length})`, users: usersResult});
    }catch (error) {

      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });

    }
  }
  subirFotoDePerfil = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

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
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { perfil } = req.body;

      const profileAct = await this.profileService.actualizarPerfil(user.user_id, perfil);

      res.json({message: 'Perfil actualizado', user: profileAct});

    } catch (error){
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
  actualizarPassword = async (req, res) => {

    try {
      const user = req.user;
      
      if (!user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const { password } = req.body;

      if(password.newPassword == password.currentPassword) 
        return res.status(400).json({
          error: 'La nueva contraseña es igual que la anterior'
        });

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

      console.error('Error en deleteFotoDePerfil:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  };
 
  deleteProfile = async (req, res) => {

    try {

      if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });

      const profileAct = await this.profileService.deleteProfile(req.user.user_id);

      if(!profileAct) throw new Error("Tuvimos un problema al intentar eliminar el perfil");

      res.json({message: 'Perfil eliminado.', user: {}});
    } catch (error){
      //console.error('Error en createTarea:', error);

      return res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}


export default ProfileController;
  