import { Injectable } from '@angular/core';
import { HistorialTecnicoComponente } from '../models/componentes-unidad.models';

export interface FiltrosHistorialPdf {
  unidad: string;
  componente: string;
  accion: string;
  fechaRetiro: string;
}

@Injectable({ providedIn: 'root' })
export class HistorialComponentesPdfService {
  async generar(
    registros: HistorialTecnicoComponente[],
    filtros: FiltrosHistorialPdf,
    descargar = true,
  ): Promise<{ nombreArchivo: string; contenido: ArrayBuffer }> {
    const { jsPDF } = await import('jspdf');
    const documento = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const fechaGeneracion = this.fechaActualGuatemala();
    const anchoPagina = documento.internal.pageSize.getWidth();

    documento.setFont('helvetica', 'bold');
    documento.setFontSize(16);
    documento.text('HISTORIAL TÉCNICO DE COMPONENTES', 14, 15);
    documento.setFont('helvetica', 'normal');
    documento.setFontSize(9);
    documento.text(`Fecha de generación: ${this.formatearFecha(fechaGeneracion)}`, 14, 22);
    documento.text([
      `Unidad: ${filtros.unidad || 'Todas'}`,
      `Componente: ${filtros.componente || 'Todos'}`,
      `Acción: ${filtros.accion || 'Todas'}`,
      `Fecha de retiro: ${filtros.fechaRetiro ? this.formatearFecha(filtros.fechaRetiro) : 'Todas'}`,
    ], 14, 29);

    let posicionY = 43;
    registros.forEach((registro) => {
      if (posicionY + 34 > documento.internal.pageSize.getHeight() - 14) {
        documento.addPage('a4', 'landscape');
        documento.setFont('helvetica', 'bold');
        documento.setFontSize(10);
        documento.setTextColor(30, 41, 59);
        documento.text('HISTORIAL TÉCNICO DE COMPONENTES', 14, 12);
        posicionY = 20;
      }

      documento.setFillColor(248, 250, 252);
      documento.roundedRect(14, posicionY, anchoPagina - 28, 34, 2, 2, 'F');
      documento.setFillColor(37, 99, 235);
      documento.rect(14, posicionY, 2, 34, 'F');
      documento.setTextColor(30, 41, 59);
      documento.setFont('helvetica', 'bold');
      documento.setFontSize(9);
      documento.text(`${registro.unidad.codigo} - ${registro.unidad.placa} | ${registro.componente.nombre}`, 19, posicionY + 6);
      documento.setFont('helvetica', 'normal');
      documento.setFontSize(8);
      documento.text(
        `Marca / modelo: ${registro.componente.marca || 'No disponible'} ${registro.componente.modelo || ''} | Posición: ${registro.componente.posicion || 'General'}`,
        19,
        posicionY + 11,
      );

      const instalacion = `${this.formatearFecha(registro.instalacion.fecha)} - ${this.formatearNumero(registro.instalacion.kilometraje)} km`;
      const retiro = `${this.formatearFecha(registro.retiro.fecha)} - ${this.formatearNumero(registro.retiro.kilometraje)}${registro.retiro.kilometraje === null ? '' : ' km'}`;
      const uso = `${this.formatearNumero(registro.uso.kilometrosUtilizados)}${registro.uso.kilometrosUtilizados === null ? '' : ' km'} / ${this.formatearNumero(registro.uso.diasUtilizados)}${registro.uso.diasUtilizados === null ? '' : ' días'}`;
      documento.text([`Instalación: ${instalacion}`, `Retiro: ${retiro}`, `Uso: ${uso}`], 19, posicionY + 17);

      const motivo = registro.retiro.motivo || 'No disponible';
      const observaciones = registro.retiro.observaciones || 'No disponible';
      documento.text(
        documento.splitTextToSize(`Motivo: ${motivo}\nObservaciones: ${observaciones}`, 77),
        105,
        posicionY + 17,
      );

      const mantenimiento = registro.mantenimiento;
      const detalle = mantenimiento
        ? `Acción: ${mantenimiento.accion}\nMantenimiento: #${mantenimiento.id} - ${mantenimiento.descripcion}\nCosto total del mantenimiento: Q${this.formatearCosto(mantenimiento.costoTotal)}`
        : 'Acción: Sin relación técnica\nMantenimiento: Sin relación técnica\nCosto total del mantenimiento: No disponible';
      documento.text(documento.splitTextToSize(detalle, 91), 188, posicionY + 17);
      posicionY += 37;
    });

    const totalPaginas = documento.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
      documento.setPage(pagina);
      documento.setFontSize(8);
      documento.setTextColor(100);
      documento.text(`Página ${pagina} de ${totalPaginas}`, anchoPagina - 14, documento.internal.pageSize.getHeight() - 6, { align: 'right' });
    }

    const unidadArchivo = filtros.unidad ? `-${this.normalizarNombre(filtros.unidad)}` : '';
    const nombreArchivo = `historial-componentes${unidadArchivo}-${fechaGeneracion}.pdf`;
    const contenido = documento.output('arraybuffer');
    if (descargar) documento.save(nombreArchivo);
    return { nombreArchivo, contenido };
  }

  private fechaActualGuatemala(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  private formatearFecha(valor: string | null): string {
    if (!valor) return 'No disponible';
    const [anio, mes, dia] = valor.slice(0, 10).split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : 'No disponible';
  }

  private formatearNumero(valor: number | null): string {
    return valor === null || !Number.isFinite(valor) ? 'No disponible' : new Intl.NumberFormat('es-GT').format(valor);
  }

  private formatearCosto(valor: string): string {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toFixed(2) : 'No disponible';
  }

  private normalizarNombre(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
  }
}
