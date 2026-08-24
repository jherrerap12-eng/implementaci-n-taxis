import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';

import { ResumenIngresos, TotalesIngresos } from './ingresos';

export type PeriodoIngresosPdf = 1 | 7 | 15 | 30;

@Injectable({ providedIn: 'root' })
export class IngresosPdfService {
  async generar(datos: ResumenIngresos, periodo: PeriodoIngresosPdf, descargar = true): Promise<{ nombreArchivo: string; contenido: ArrayBuffer }> {
    const { jsPDF: ConstructorPdf } = await import('jspdf');
    const pdf = new ConstructorPdf({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const fechaGeneracion = this.fechaGuatemala();
    let y = 14;

    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text('REPORTE DE INGRESOS', 14, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Periodo seleccionado: ${periodo === 1 ? 'Hoy' : `Ultimos ${periodo} dias`}`, 14, y);
    pdf.text(`Fecha de generacion: ${this.fecha(fechaGeneracion)}`, ancho - 14, y, { align: 'right' });
    y += 5;
    pdf.text(`Desde: ${this.fecha(datos.periodo.fechaInicio)}   Hasta: ${this.fecha(datos.periodo.fechaFin)}`, 14, y);
    y += 9;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text('RESUMEN GENERAL', 14, y);
    y += 5;
    const indicadores = [
      ['Monto liquidado', this.moneda(datos.totales.montoLiquidado)],
      ['Combustible', this.moneda(datos.totales.montoCombustible)],
      ['Galones', this.numero(datos.totales.galones, 3)],
      ['Mantenimientos', this.moneda(datos.totales.montoMantenimientos)],
      ['Repuestos menores', this.moneda(datos.totales.montoRepuestosMenores)],
      ['Pinchazos', this.moneda(datos.totales.montoPinchazos)],
      ['Gastos totales', this.moneda(datos.totales.gastosTotales)],
      ['Utilidad operativa', this.moneda(datos.totales.utilidadOperativa)],
      ['Operaciones', this.numero(datos.totales.operaciones)],
      ['Kilometros recorridos', `${this.numero(datos.totales.kilometrosRecorridos)} km`],
    ];
    const anchoTarjeta = (ancho - 40) / 5;
    indicadores.forEach(([etiqueta, valor], i) => {
      const x = 14 + (i % 5) * (anchoTarjeta + 3);
      const tarjetaY = y + Math.floor(i / 5) * 18;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, tarjetaY, anchoTarjeta, 15, 1.5, 1.5, 'F');
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139);
      pdf.text(etiqueta, x + 3, tarjetaY + 5);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(30, 41, 59);
      pdf.text(valor, x + 3, tarjetaY + 11);
    });
    y += 42;

    y = this.seccion(pdf, 'RESULTADOS POR DIA', datos.porDia.map(d => ({ titulo: this.fecha(d.fecha), detalle: this.detalle(d) })), y, alto);
    y = this.seccion(pdf, 'RESULTADOS POR UNIDAD', datos.porUnidad.map(u => ({ titulo: `${this.texto(u.numeroUnidad)} - Placa ${this.texto(u.placa)}`, detalle: this.detalle(u) })), y, alto);
    this.seccion(pdf, 'RESULTADOS POR PILOTO', datos.porPiloto.map(p => ({ titulo: `${this.texto(p.nombreCompleto)} - Codigo ${this.texto(p.codigo)}`, detalle: this.detalle(p) })), y, alto);

    const paginas = pdf.getNumberOfPages();
    for (let pagina = 1; pagina <= paginas; pagina++) {
      pdf.setPage(pagina); pdf.setDrawColor(226, 232, 240); pdf.line(14, alto - 10, ancho - 14, alto - 10);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100, 116, 139);
      pdf.text(`Pagina ${pagina} de ${paginas}`, ancho - 14, alto - 6, { align: 'right' });
    }
    const segmento = periodo === 1 ? 'hoy' : `${periodo}-dias`;
    const nombreArchivo = `ingresos-${segmento}-${fechaGeneracion}.pdf`;
    const contenido = pdf.output('arraybuffer');
    if (descargar) pdf.save(nombreArchivo);
    return { nombreArchivo, contenido };
  }

  private seccion(pdf: jsPDF, titulo: string, registros: { titulo: string; detalle: string }[], inicial: number, alto: number): number {
    let y = inicial;
    const nuevaPagina = () => { pdf.addPage('a4', 'landscape'); y = 15; };
    if (y + 13 > alto - 13) nuevaPagina();
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(30, 41, 59); pdf.text(titulo, 14, y); y += 5;
    if (!registros.length) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(100, 116, 139);
      pdf.text('Sin registros para el periodo seleccionado.', 14, y + 4); return y + 13;
    }
    registros.forEach(registro => {
      if (y + 15 > alto - 13) { nuevaPagina(); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.text(`${titulo} (continuacion)`, 14, y); y += 5; }
      pdf.setFillColor(248, 250, 252); pdf.roundedRect(14, y, pdf.internal.pageSize.getWidth() - 28, 12, 1.5, 1.5, 'F');
      pdf.setFillColor(37, 99, 235); pdf.rect(14, y, 2, 12, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(30, 41, 59); pdf.text(registro.titulo, 19, y + 4.5);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105); pdf.text(registro.detalle, 19, y + 9); y += 15;
    });
    return y + 4;
  }

  private detalle(d: TotalesIngresos): string {
    return `Operaciones: ${this.numero(d.operaciones)}   |   Kilometros: ${this.numero(d.kilometrosRecorridos)} km   |   Liquidado: ${this.moneda(d.montoLiquidado)}   |   Combustible: ${this.moneda(d.montoCombustible)}   |   Galones: ${this.numero(d.galones, 3)}`;
  }
  private fechaGuatemala(): string { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
  private fecha(valor: string): string { const [a, m, d] = (valor || '').slice(0, 10).split('-'); return a && m && d ? `${d}/${m}/${a}` : 'No disponible'; }
  private moneda(valor: number): string { return Number.isFinite(valor) ? `Q${new Intl.NumberFormat('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)}` : 'No disponible'; }
  private numero(valor: number, decimales = 0): string { return Number.isFinite(valor) ? new Intl.NumberFormat('es-GT', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).format(valor) : 'No disponible'; }
  private texto(valor: string | null | undefined): string { return valor?.trim() || 'No disponible'; }
}
