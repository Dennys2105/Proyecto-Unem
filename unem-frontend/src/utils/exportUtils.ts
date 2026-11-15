import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 1. Exportar a Excel
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// 2. Generar Ficha Académica Individual (CON CORRECCIÓN DE MARGEN)
export const generateFichaAcademicaPDF = (data: {
  estado: string; municipio: string; aulaTaller: string; periodoAcademico: string;
  programaFormacion: string; cohorte: string; trayecto: string; semestre: string;
  unidadCurricular: string[]; docenteInvestigador: string; cedulaIdentidad: string;
  correo: string; telefono: string; fechaEntrega: string;
  horarioSemanal: Array<{ horario: string; viernes: string; sabado: string; observacion: string }>;
}, fileName: string = 'Ficha_Organizacion_Academica') => {
  const doc = new jsPDF();
  
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO', 105, 15, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('"SAMUEL ROBINSON"', 105, 20, { align: 'center' });
  doc.setLineWidth(0.5); doc.line(10, 25, 200, 25);
  
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('FICHA DE ORGANIZACIÓN ACADÉMICA DEL DOCENTE INVESTIGADOR', 105, 32, { align: 'center' });
  
  let yPos = 40; doc.setFontSize(9);
  doc.setFont('helvetica', 'bold'); doc.text('Estado:', 15, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.estado.toUpperCase(), 45, yPos);
  doc.setFont('helvetica', 'bold'); doc.text('Municipio:', 90, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.municipio.toUpperCase(), 120, yPos);
  
  // CORRECCIÓN: Ajuste de margen y tamaño para "Aula Taller"
  doc.setFont('helvetica', 'bold'); doc.text('Aula Taller:', 150, yPos);
  doc.setFont('helvetica', 'normal'); 
  const aulaText = doc.splitTextToSize(data.aulaTaller.toUpperCase(), 45);
  doc.text(aulaText, 175, yPos);
  
  yPos += 8; doc.setFont('helvetica', 'bold'); doc.text('Período Académico:', 15, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.periodoAcademico, 55, yPos);
  yPos += 8; doc.setFont('helvetica', 'bold'); doc.text('Programa de Formación:', 15, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.programaFormacion.toUpperCase(), 60, yPos);
  yPos += 10; doc.setFont('helvetica', 'bold'); doc.text('Cohorte:', 15, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.cohorte, 35, yPos);
  doc.setFont('helvetica', 'bold'); doc.text('Trayecto:', 70, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.trayecto, 95, yPos);
  doc.setFont('helvetica', 'bold'); doc.text('Semestre:', 120, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.semestre, 145, yPos);
  yPos += 10; doc.setFont('helvetica', 'bold'); doc.text('Unidad Curricular:', 15, yPos);
  yPos += 5; doc.setFont('helvetica', 'normal');
  data.unidadCurricular.forEach((uc, index) => { doc.text(`${index + 1}. ${uc}`, 15, yPos); yPos += 5; });
  yPos += 8; doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(10, yPos, 190, 25);
  doc.setFont('helvetica', 'bold'); doc.text('Docente Investigador:', 15, yPos + 6);
  doc.setFont('helvetica', 'normal'); doc.text(data.docenteInvestigador.toUpperCase(), 60, yPos + 6);
  doc.setFont('helvetica', 'bold'); doc.text('C.I.:', 140, yPos + 6);
  doc.setFont('helvetica', 'normal'); doc.text(data.cedulaIdentidad, 155, yPos + 6);
  doc.setFont('helvetica', 'bold'); doc.text('Correo:', 15, yPos + 13);
  doc.setFont('helvetica', 'normal'); doc.text(data.correo.toLowerCase(), 35, yPos + 13);
  doc.setFont('helvetica', 'bold'); doc.text('Teléfono:', 110, yPos + 13);
  doc.setFont('helvetica', 'normal'); doc.text(data.telefono, 135, yPos + 13);
  yPos += 30; doc.setFont('helvetica', 'bold'); doc.text('Fecha de Entrega:', 15, yPos);
  doc.setFont('helvetica', 'normal'); doc.text(data.fechaEntrega, 50, yPos);
  yPos += 8;
  
  const horariosTable = data.horarioSemanal.map(h => [h.horario, h.viernes, h.sabado, h.observacion]);
  autoTable(doc, {
    startY: yPos, head: [['Horario', 'Viernes', 'Sábado', 'Observación']], body: horariosTable,
    theme: 'grid', headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 9 },
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 35, halign: 'center' }, 1: { cellWidth: 55 }, 2: { cellWidth: 55 }, 3: { cellWidth: 45 } },
    margin: { left: 10, right: 10 }
  });
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
  doc.text('Vicerrectorado Académico Territorial', 105, finalY, { align: 'center' });
  doc.save(`${fileName}.pdf`);
};

// 3. Generar Reporte General por PNF
export const generateGeneralPNFPDF = (
  data: Array<{ dia: string; hora: string; docente: string; materia: string; espacio: string }>,
  pnfNombre: string, fileName: string = 'Horario_General_PNF'
) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO', 148, 15, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('"SAMUEL ROBINSON"', 148, 20, { align: 'center' });
  doc.setLineWidth(0.5); doc.line(10, 25, 287, 25);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(`HORARIO SEMANAL GENERAL - PNF ${pnfNombre.toUpperCase()}`, 148, 35, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-VE')}`, 148, 42, { align: 'center' });

  autoTable(doc, {
    head: [['Día', 'Horario', 'Docente Investigador', 'Unidad Curricular', 'Espacio Físico']],
    body: data.map(row => [row.dia, row.hora, row.docente, row.materia, row.espacio]),
    startY: 48, theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 60 }, 3: { cellWidth: 80 }, 4: { cellWidth: 50 } },
    margin: { left: 10, right: 10 },
    didParseCell: (data: any) => { if (data.column.index === 0 && data.section === 'body') data.cell.styles.fillColor = [240, 240, 240]; }
  });
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text('Vicerrectorado Académico Territorial - Sistema de Gestión de Horarios', 148, finalY, { align: 'center' });
  doc.save(`${fileName}.pdf`);
};