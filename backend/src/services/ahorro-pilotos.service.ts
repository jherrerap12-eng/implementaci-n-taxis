import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import type {
  RegistrarAjusteAhorroDatos,
  RegistrarRetiroAhorroDatos,
} from '../schemas/ahorro-pilotos.schemas.js';

type ClientePrisma = Prisma.TransactionClient | typeof prisma;
type TipoMovimiento = 'APORTE_DIARIO' | 'RETIRO' | 'AJUSTE_INGRESO' | 'AJUSTE_EGRESO';

export class ErrorAhorroPiloto extends Error {
  constructor(readonly status: 404 | 409, message: string) {
    super(message);
    this.name = 'ErrorAhorroPiloto';
  }
}

function signoMovimiento(tipo: TipoMovimiento): 1 | -1 {
  return tipo === 'APORTE_DIARIO' || tipo === 'AJUSTE_INGRESO' ? 1 : -1;
}

function dinero(valor: number): number {
  return Number(valor.toFixed(2));
}

async function bloquearPiloto(
  transaccion: Prisma.TransactionClient,
  pilotoId: number,
): Promise<void> {
  const piloto = await transaccion.$queryRaw<Array<{ id: number }>>(
    Prisma.sql`SELECT id FROM pilotos WHERE id = ${pilotoId} FOR UPDATE`,
  );
  if (piloto.length === 0) {
    throw new ErrorAhorroPiloto(404, 'El piloto no existe');
  }
}

async function calcularSaldo(pilotoId: number, cliente: ClientePrisma): Promise<number> {
  const movimientos = await cliente.movimientoAhorroPiloto.findMany({
    where: { pilotoId },
    select: { tipo: true, monto: true },
  });
  return dinero(movimientos.reduce(
    (saldo, movimiento) => saldo + signoMovimiento(movimiento.tipo) * Number(movimiento.monto),
    0,
  ));
}

export async function listarAhorroPilotos() {
  const pilotos = await prisma.piloto.findMany({
    select: {
      id: true,
      codigo: true,
      nombreCompleto: true,
      estado: true,
      movimientosAhorro: {
        select: { tipo: true, monto: true, creadoEn: true },
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      },
    },
    orderBy: { nombreCompleto: 'asc' },
  });

  return pilotos.map((piloto) => {
    const totales = {
      totalAportado: 0,
      totalRetirado: 0,
      ajustesIngreso: 0,
      ajustesEgreso: 0,
    };
    piloto.movimientosAhorro.forEach((movimiento) => {
      const monto = Number(movimiento.monto);
      if (movimiento.tipo === 'APORTE_DIARIO') totales.totalAportado += monto;
      if (movimiento.tipo === 'RETIRO') totales.totalRetirado += monto;
      if (movimiento.tipo === 'AJUSTE_INGRESO') totales.ajustesIngreso += monto;
      if (movimiento.tipo === 'AJUSTE_EGRESO') totales.ajustesEgreso += monto;
    });
    const saldoDisponible =
      totales.totalAportado + totales.ajustesIngreso -
      totales.totalRetirado - totales.ajustesEgreso;
    return {
      id: piloto.id,
      codigo: piloto.codigo,
      nombreCompleto: piloto.nombreCompleto,
      estado: piloto.estado,
      totalAportado: dinero(totales.totalAportado),
      totalRetirado: dinero(totales.totalRetirado),
      ajustesIngreso: dinero(totales.ajustesIngreso),
      ajustesEgreso: dinero(totales.ajustesEgreso),
      saldoDisponible: dinero(saldoDisponible),
      ultimoMovimientoEn: piloto.movimientosAhorro[0]?.creadoEn ?? null,
    };
  });
}

export async function obtenerMovimientosAhorro(pilotoId: number) {
  const piloto = await prisma.piloto.findUnique({
    where: { id: pilotoId },
    select: { id: true, codigo: true, nombreCompleto: true, estado: true },
  });
  if (!piloto) throw new ErrorAhorroPiloto(404, 'El piloto no existe');

  const movimientos = await prisma.movimientoAhorroPiloto.findMany({
    where: { pilotoId },
    select: {
      id: true, tipo: true, monto: true, descripcion: true, creadoEn: true,
      registroDiario: { select: { id: true, fecha: true } },
    },
    orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
  });
  let saldo = 0;
  const historial = movimientos.map((movimiento) => {
    saldo = dinero(saldo + signoMovimiento(movimiento.tipo) * Number(movimiento.monto));
    return {
      ...movimiento,
      monto: dinero(Number(movimiento.monto)),
      signo: signoMovimiento(movimiento.tipo),
      saldoAcumulado: saldo,
    };
  }).reverse();
  return { piloto, saldoDisponible: dinero(saldo), movimientos: historial };
}

export async function registrarAjusteAhorro(
  pilotoId: number,
  datos: RegistrarAjusteAhorroDatos,
) {
  return prisma.$transaction(async (transaccion) => {
    await bloquearPiloto(transaccion, pilotoId);
    const saldoActual = await calcularSaldo(pilotoId, transaccion);
    const esEgreso = datos.tipo === 'EGRESO';
    if (esEgreso && datos.monto > saldoActual) {
      throw new ErrorAhorroPiloto(409, 'El ajuste de egreso supera el saldo disponible');
    }
    const movimiento = await transaccion.movimientoAhorroPiloto.create({
      data: {
        pilotoId,
        tipo: esEgreso ? 'AJUSTE_EGRESO' : 'AJUSTE_INGRESO',
        monto: datos.monto.toFixed(2),
        descripcion: datos.descripcion,
      },
    });
    return {
      ...movimiento,
      monto: dinero(Number(movimiento.monto)),
      saldoDisponible: dinero(saldoActual + (esEgreso ? -datos.monto : datos.monto)),
    };
  });
}

export async function registrarRetiroAhorro(
  pilotoId: number,
  datos: RegistrarRetiroAhorroDatos,
) {
  return prisma.$transaction(async (transaccion) => {
    await bloquearPiloto(transaccion, pilotoId);
    const saldoActual = await calcularSaldo(pilotoId, transaccion);
    const monto = datos.liquidarTodo ? saldoActual : datos.monto ?? 0;
    if (monto <= 0) {
      throw new ErrorAhorroPiloto(409, 'El piloto no tiene saldo disponible para retirar');
    }
    if (monto > saldoActual) {
      throw new ErrorAhorroPiloto(409, 'El retiro supera el saldo disponible');
    }
    const movimiento = await transaccion.movimientoAhorroPiloto.create({
      data: {
        pilotoId,
        tipo: 'RETIRO',
        monto: dinero(monto).toFixed(2),
        descripcion: datos.descripcion,
      },
    });
    return {
      ...movimiento,
      monto: dinero(Number(movimiento.monto)),
      saldoDisponible: dinero(saldoActual - monto),
    };
  });
}
