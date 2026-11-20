// elementos del contenedor de inyección de dependencias
import { createContainer, asClass, asValue, asFunction } from 'awilix';

// configuración de la aplicación
import app from './server.js';
import { DBPool } from './config/index.js';

// routers
import { AuthRoutes, ProfileRoutes, TareasRoutes, CollaboratorsRoutes } from './routes/index.js';
import routes from './routes/routes.js';

// controladores
import { AuthController, ProfileController, TaskController, CommentsController, CollaboratorsController } from './controllers/index.js';

// servicios
import { AuthService, ProfileService, TaskService, CommentsService, CollaboratorsService, MailService } from './services/index.js';

// repositorios
import { UserRepository, TaskRepository, CommentsRepository, CollaboratorsRepository } from './repositories/index.js';

// validaciones
import { UserValidations } from './validations/index.js';





const container = createContainer();
//  Registra la configuración de la aplicación
container.register({
  app: asClass(app).singleton(),
  routes: asFunction(routes).singleton(),
  DBPool: asValue(DBPool)
});

// Registrar Rutas
container.register({
  AuthRoutes: asFunction(AuthRoutes).singleton(),
  ProfileRoutes: asFunction(ProfileRoutes).singleton(),
  TareasRoutes: asFunction(TareasRoutes).singleton(),
  CollaboratorsRoutes: asFunction(CollaboratorsRoutes).singleton()
});

// Registrar Controladores
container.register({
  AuthController: asClass(AuthController).singleton(),
  ProfileController: asClass(ProfileController).singleton(),
  TaskController: asClass(TaskController).singleton(),
  CommentsController: asClass(CommentsController).singleton(),
  CollaboratorsController: asClass(CollaboratorsController).singleton()
});

// Registrar Servicios
container.register({
  AuthService: asClass(AuthService).singleton(),
  ProfileService: asClass(ProfileService).singleton(),
  TaskService: asClass(TaskService).singleton(),
  CommentsService: asClass(CommentsService).singleton(),
  CollaboratorsService: asClass(CollaboratorsService).singleton(),
  MailService: asClass(MailService).singleton()
});

// Registrar Repositorios
container.register({
  UserRepository: asClass(UserRepository).singleton(),
  TaskRepository: asClass(TaskRepository).singleton(),
  CommentsRepository: asClass(CommentsRepository).singleton(),
  CollaboratorsRepository: asClass(CollaboratorsRepository).singleton()
});

// Registrar Modelos
/*container.register({
  User: asValue(User)
});*/

// Registrar Validaciones
container.register({
  UserValidations: asValue(UserValidations)
});

export default container;
