import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Permite recibir solicitudes desde el frontend Angular.
app.use(
  cors({
    origin: 'http://localhost:4200',
  }),
);

// Permite recibir información en formato JSON.
app.use(express.json());

// Ruta sencilla para comprobar que la API funciona.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'API del sistema de flotilla funcionando correctamente',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});