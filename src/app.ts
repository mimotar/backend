import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import routes from './routes';
import { errorHandler } from './middlewares/error/error.middlewares';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res, next);
});

export default app;


