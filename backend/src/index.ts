import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

import { prisma } from './lib/prisma.js';
import { pilotosRouter } from './routes/pilotos.routes.js';
import { unidadesRouter } from './routes/unidades.routes.js';
import { registrosDiariosRouter } from './routes/registros-diarios.routes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
    ],
  }),
);

app.use(express.json());

app.use('/api/pilotos', pilotosRouter);
app.use('/api/unidades', unidadesRouter);
app.use('/api/registros-diarios', registrosDiariosRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API del sistema de flotilla funcionando correctamente',
  });
});

// Comprueba que Node.js pueda consultar PostgreSQL mediante Prisma.
app.get(
  '/api/health/database',
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