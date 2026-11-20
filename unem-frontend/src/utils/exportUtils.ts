import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// 1. EXPORTAR A EXCEL (Mejorado con encabezado)
// ==========================================
export const exportToExcel = (data: any[], fileName: string) => {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

  const headers = Object.keys(data[0] || {});
  const dataRows = data.map(row => headers.map(h => row[h] || ''));

  const aoa = [
    ['UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO "SAMUEL ROBINSON"'],
    ['REPORTE DE ASIGNACIÓN DE CARGA HORARIA'],
    [`Generado el: ${today}`, '', 'Sistema de Gestión de Horarios - UNEM'],
    [''],
    headers,
    ...dataRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  
  // Anchos de columna optimizados
  ws['!cols'] = [
    { wch: 8 },   // ID
    { wch: 28 },  // Docente
    { wch: 45 },  // Materia
    { wch: 12 },  // Programa
    { wch: 12 },  // Día
    { wch: 10 },  // Inicio
    { wch: 10 },  // Fin
    { wch: 35 },  // Espacio
    { wch: 20 },  // Tipo
  ];
  
  // Activar autofiltros
  ws['!autofilter'] = { ref: `A5:I${5 + dataRows.length}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Carga Horaria');
  const fechaArchivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileName}_${fechaArchivo}.xlsx`);
};

// ==========================================
// 2. EXPORTAR HORARIO INDIVIDUAL POR DOCENTE (Excel)
// ==========================================
export const exportHorarioDocente = (
  docente: { nombre: string; apellido: string; cedula: string },
  asignaciones: any[],
  dias: any[],
  mallas: any[],
  espacios: any[]
) => {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

  const aoa = [
    ['UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO "SAMUEL ROBINSON"'],
    ['HORARIO ACADÉMICO SEMANAL - DOCENTE'],
    [''],
    [`Docente: ${docente.nombre} ${docente.apellido}`, '', `Cédula: ${docente.cedula}`],
    [`Período: Trimestre 2025-I`, '', `Generado: ${today}`],
    [''],
    ['Día', 'Horario', 'Materia', 'Programa', 'Espacio', 'Tipo Actividad'],
    ...asignaciones.map(a => {
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
    })
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 35 }, { wch: 20 }];
  ws['!autofilter'] = { ref: `A7:F${7 + asignaciones.length}` };

  XLSX.utils.book_append_sheet(wb, ws, 'Horario Docente');
  XLSX.writeFile(wb, `Horario_${docente.nombre}_${docente.apellido}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// ==========================================
// 3. GENERAR REPORTE GENERAL POR PNF (PDF)
// ==========================================
const cargarMembrete = async (): Promise<string | null> => {
  try {
    const r = await fetch('/membrete-unem.png');
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
};

export const generateGeneralPNFPDF = async (
  data: Array<{ dia: string; hora: string; docente: string; materia: string; espacio: string }>,
  pnfNombre: string,
  fileName: string = 'Horario_General_PNF'
) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const membrete = await cargarMembrete();
  let y = 10;
  if (membrete) { doc.addImage(membrete, 'PNG', 10, 4, 277, 18); y = 26; }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`HORARIO SEMANAL GENERAL - PNF ${pnfNombre.toUpperCase()}`, 148, y + 6, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-VE')}`, 148, y + 12, { align: 'center' });

  autoTable(doc, {
    head: [['Día', 'Horario', 'Docente Investigador', 'Unidad Curricular', 'Espacio Físico']],
    body: data.map(row => [row.dia, row.hora, row.docente, row.materia, row.espacio]),
    startY: y + 16,
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 10 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
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

  const finalY = ((doc as any).lastAutoTable?.finalY ?? y + 16) + 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Vicerrectorado Académico Territorial - Sistema de Gestión de Horarios', 148, finalY, { align: 'center' });
  doc.save(`${fileName}.pdf`);
};