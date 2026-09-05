import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';

import { env } from './config/env.js';
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
import { componentesRouter } from './routes/componentes.routes.js';
import { catalogoComponentesRouter } from './routes/catalogo-componentes.routes.js';
import { componentesUnidadRouter } from './routes/componentes-unidad.routes.js';
import { indicadoresMantenimientoRouter } from './routes/indicadores-mantenimiento.routes.js';
import { ahorroPilotosRouter } from './routes/ahorro-pilotos.routes.js';

dotenv.config();

const app = express();
const PORT = env.PORT;

// Render entrega las solicitudes a Express a través de un proxy inverso.
// Confiar solo en el primer salto permite identificar correctamente la IP
// del cliente en middlewares como express-rate-limit.
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      ...(env.FRONTEND_URL ? [env.FRONTEND_URL] : []),
    ],
  }),
);

app.use(express.json());

app.use('/api/auth', authRouter);
app.use(
  '/api/ahorro-pilotos',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  ahorroPilotosRouter,
);
app.use(
  '/api/indicadores-mantenimiento',
  autenticar,
  autorizarRoles('SUPERADMIN', 'DUENO'),
  indicadoresMantenimientoRouter,
);
app.use(
  '/api/componentes-unidad',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  componentesUnidadRouter,
);
app.use(
  '/api/catalogo-componentes',
  autenticar,
  autorizarRoles('SUPERADMIN'),
  catalogoComponentesRouter,
);
app.use(
  '/api/componentes',
  autenticar,
  autorizarRoles('SUPERADMIN', 'DUENO'),
  componentesRouter,
);
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
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
