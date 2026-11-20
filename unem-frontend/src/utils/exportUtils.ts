import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AZUL = 'FF1F4E78';
const AZUL_CLARO = 'FFDCE6F1';

type Membrete = { base64: string; ratio: number };

const cargarMembrete = async (): Promise<Membrete | null> => {
  try {
    const r = await fetch('/membrete-unem.png');
    if (!r.ok) return null;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const ratio = await new Promise<number>((res) => {
      const img = new Image();
      img.onload = () => res(img.naturalHeight / img.naturalWidth);
      img.onerror = () => res(0);
      img.src = url;
    });
    const base64 = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res((fr.result as string).split(',')[1] || '');
      fr.onerror = () => res('');
      fr.readAsDataURL(blob);
    });
    URL.revokeObjectURL(url);
    return ratio && base64 ? { base64, ratio } : null;
  } catch { return null; }
};

const descargarBuffer = (buf: ArrayBuffer, nombre: string): void => {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
};

const construirHoja = async (
  nombreHoja: string, titulo: string, subtitulo: string[],
  headers: string[], rows: (string | number)[][], widths: number[]
): Promise<ExcelJS.Workbook> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'UNEM Táchira';
  const ws = wb.addWorksheet(nombreHoja);
  const ncols = Math.max(headers.length, 1);

  for (let r = 1; r <= 4; r++) ws.getRow(r).height = 22;
  const m = await cargarMembrete();
  if (m) {
    const id = wb.addImage({ base64: m.base64, extension: 'png' });
    const alto = 88;
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: alto / m.ratio, height: alto } });
  }

  ws.mergeCells(5, 1, 5, ncols);
  const t = ws.getCell(5, 1);
  t.value = titulo;
  t.font = { bold: true, size: 14, color: { argb: AZUL } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(5).height = 24;

  ws.mergeCells(6, 1, 6, ncols);
  const s = ws.getCell(6, 1);
  s.value = subtitulo.join('   ·   ');
  s.font = { size: 10, color: { argb: 'FF555555' } };
  s.alignment = { horizontal: 'center' };

  const hr = ws.getRow(8);
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  hr.height = 20;

  rows.forEach((r, ri) => {
    const row = ws.getRow(9 + ri);
    r.forEach((v, ci) => {
      const c = row.getCell(ci + 1);
      c.value = v;
      c.alignment = { vertical: 'middle', wrapText: true };
      c.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
      if (ri % 2 === 1) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_CLARO } };
    });
  });

  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const lastCol = ws.getColumn(ncols).letter;
  ws.autoFilter = `A8:${lastCol}${8 + rows.length}`;
  ws.views = [{ state: 'frozen', ySplit: 8 }];
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return wb;
};

// 1) Excel general de carga horaria
export const exportToExcel = async (data: any[], fileName: string): Promise<void> => {
  const headers = Object.keys(data[0] || {});
  const rows = data.map(row => headers.map(h => row[h] ?? ''));
  const today = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
  const wb = await construirHoja(
    'Carga Horaria', 'REPORTE DE ASIGNACIÓN DE CARGA HORARIA',
    [`Generado el: ${today}`, 'Sistema de Gestión de Horarios - UNEM'],
    headers.length ? headers : ['Sin datos'], rows, [8, 28, 45, 12, 12, 10, 10, 35, 20]
  );
  descargarBuffer(await wb.xlsx.writeBuffer() as ArrayBuffer, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 2) Excel horario individual por docente
export const exportHorarioDocente = async (
  docente: { nombre: string; apellido: string; cedula: string },
  asignaciones: any[], dias: any[], mallas: any[], espacios: any[]
): Promise<void> => {
  const headers = ['Día', 'Horario', 'Materia', 'Programa', 'Espacio', 'Tipo Actividad'];
  const rows = asignaciones.map(a => {
    const malla = mallas?.find((m: any) => m.id_malla === a.id_malla);
    const esp = espacios?.find((e: any) => e.id_esp === a.id_esp);
    const dia = dias?.find((d: any) => d.id_dia === a.id_dia);
    return [
      dia?.dia || 'N/A',
      `${a.hora_inicio?.slice(0, 5)} - ${a.hora_fin?.slice(0, 5)}`,
      malla?.materia?.nombre || 'N/A',
      malla?.programa?.codigo || 'N/A',
      esp ? `${esp.ubicacion} - ${esp.nombre_centro}` : 'N/A',
      a.tipo_actividad || 'Carga Académica'
    ];
  });
  const today = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
  const wb = await construirHoja(
    'Horario Docente', 'HORARIO ACADÉMICO SEMANAL - DOCENTE',
    [`${docente.nombre} ${docente.apellido}`, `Cédula: ${docente.cedula}`, `Generado: ${today}`],
    headers, rows, [12, 18, 45, 12, 35, 20]
  );
  descargarBuffer(await wb.xlsx.writeBuffer() as ArrayBuffer, `Horario_${docente.nombre}_${docente.apellido}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 3) PDF general por PNF (membrete proporcional + filas altas + pie al fondo)
export const generateGeneralPNFPDF = async (
  data: Array<{ dia: string; hora: string; docente: string; materia: string; espacio: string }>,
  pnfNombre: string, fileName: string = 'Horario_General_PNF'
): Promise<void> => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const m = await cargarMembrete();
  let y = 8;
  if (m) {
    const ancho = 277;
    const alto = ancho * m.ratio;
    doc.addImage(m.base64, 'PNG', 10, y, ancho, alto);
    y += alto + 4;
  }
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(`HORARIO SEMANAL GENERAL - PNF ${pnfNombre.toUpperCase()}`, 148, y + 6, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-VE')}`, 148, y + 12, { align: 'center' });

  autoTable(doc, {
    head: [['Día', 'Horario', 'Docente Investigador', 'Unidad Curricular', 'Espacio Físico']],
    body: data.map(row => [row.dia, row.hora, row.docente, row.materia, row.espacio]),
    startY: y + 16,
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
    bodyStyles: { fontSize: 10, cellPadding: 4, minCellHeight: 14 },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 80 },
      4: { cellWidth: 50 }
    },
    margin: { left: 10, right: 10 },
    didParseCell: (hook: any) => {
      if (hook.column.index === 0 && hook.section === 'body') hook.cell.styles.fillColor = [240, 240, 240];
    }
  });

  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text('Vicerrectorado Académico Territorial - Sistema de Gestión de Horarios',
    148, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  doc.save(`${fileName}.pdf`);
};