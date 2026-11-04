import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

class AuthService {
  constructor({ UserRepository, UserValidations }) {
    this.userRepository = UserRepository;
    this.userValidations = UserValidations;
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
}

export default AuthService;