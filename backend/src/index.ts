import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';

import { prisma } from './lib/prisma.js';
import { autenticar } from './middleware/autenticar.js';
import { autorizarRoles } from './middleware/autorizar-roles.js';
import { authRouter } from './routes/auth.routes.js';
import { pilotosRouter } from './routes/pilotos.routes.js';
import { unidadesRouter } from './routes/unidades.routes.js';
import { registrosDiariosRouter } from './routes/registros-diarios.routes.js';
import { ingresosRouter } from './routes/ingresos.routes.js';
import { mantenimientosRouter } from './routes/mantenimientos.routes.js';
import { gastosRouter } from './routes/gastos.routes.js';
import { usuariosRouter } from './routes/usuarios.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(helmet());

app.use(
  cors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ],
  }),
);

app.use(express.json());

app.use('/api/auth', authRouter);
app.use(
  '/api/dashboard',
  autenticar,
  autorizarRoles('SUPERADMIN', 'DUENO'),
  dashboardRouter,
);
app.use(
  '/api/usuarios',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  usuariosRouter,
);
app.use(
  '/api/pilotos',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  pilotosRouter,
);
app.use(
  '/api/unidades',
  autenticar,
  unidadesRouter,
);
app.use(
  '/api/registros-diarios',
  autenticar,
  registrosDiariosRouter,
);
app.use(
  '/api/ingresos',
  autenticar,
  autorizarRoles('SUPERADMIN', 'DUENO'),
  ingresosRouter,
);
app.use(
  '/api/mantenimientos',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  mantenimientosRouter,
);
app.use(
  '/api/gastos',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  gastosRouter,
);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API del sistema de flotilla funcionando correctamente',
  });
});

// Comprueba que Node.js pueda consultar PostgreSQL mediante Prisma.
app.get(
  '/api/health/database',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const [pilotosRegistrados, unidadesRegistradas] = await Promise.all([
        prisma.piloto.count(),
        prisma.unidad.count(),
      ]);

      res.status(200).json({
        success: true,
        message: 'Conexión con PostgreSQL realizada correctamente',
        data: {
          pilotosRegistrados,
          unidadesRegistradas,
        },
      });
    } catch (error) {
      console.error('Error al conectar con PostgreSQL:', error);

      res.status(500).json({
        success: false,
        message: 'No fue posible conectar con PostgreSQL',
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
