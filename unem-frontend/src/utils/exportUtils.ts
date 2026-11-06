// src/utils/exportUtils.ts
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Función para exportar a Excel
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Función para exportar a PDF
export const exportToPDF = (data: any[], columns: any[], fileName: string, title: string) => {
  const doc = new jsPDF();
  
  // 1. Encabezado Institucional
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102); // Azul institucional
  doc.text('UNIVERSIDAD NACIONAL EXPERIMENTAL DEL MAGISTERIO', 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 105, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generado el: ${new Date().toLocaleDateString('es-VE')} a las ${new Date().toLocaleTimeString('es-VE')}`, 105, 32, { align: 'center' });

  // 2. Preparar datos para la tabla
  const tableHeaders = columns.map((col: any) => col.header || col.key);
  const tableData = data.map((row: any) => 
    columns.map((col: any) => {
      // Si la columna tiene una función de renderizado personalizado, la usamos
      if (col.render) return col.render(row[col.key], row);
      // Si no, convertimos el valor a string, o ponemos 'N/A' si es nulo
      return row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : 'N/A';
    })
  );

  // 3. Generar la tabla con autoTable
  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [0, 51, 102], // Azul institucional
      textColor: 255, 
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [200, 200, 200]
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250] // Gris muy suave para filas alternas
    }
  });

  // 4. Pie de página
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${pageCount} - Sistema de Horarios UNEM`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  // 5. Descargar
  doc.save(`${fileName}.pdf`);
};