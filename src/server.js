
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';

export default class Server {
  constructor({ routes }) {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado');
    }
    this.app = express()
      .use(cookieParser())
      .use(express.json())
      .use(routes)
      .use(
        '/uploads',
        express.static(path.join(process.cwd(), 'uploads'))
      );

    this.httpServer = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(
        process.env.PORT,
        () => {
          console.log(
            'API running on port ' + process.env.PORT
          );

          resolve(this.httpServer);
        }
      );

      this.httpServer.once('error', reject);
    });
  }

  stop() {
    if (!this.httpServer) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.httpServer.close(error => {
        if (error) {
          reject(error);
          return;
        }

        this.httpServer = null;
        resolve();
      });
    });
  }
}
