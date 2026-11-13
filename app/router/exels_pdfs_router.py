import io
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, status,Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session,text
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment,Border,Side
from openpyxl.utils import get_column_letter
from typing import Optional
from jinja2 import Template
from xhtml2pdf import pisa

from app.config.db_conection import get_session 
from app.dependencies.auth_deps import verificar_permiso


router = APIRouter(prefix="/pruebas", tags=["Pruebas"])

@router.get("/exportar-inventario", summary="Generar reporte avanzado con Pandas y Openpyxl")
def exportar_inventario():
    # 1. Preparar datos con Pandas
    data = {
        "Producto": ["Laptop Pro", "Mouse Inalámbrico", "Teclado Mecánico", "Monitor 27\"", "Audífonos BT"],
        "Categoría": ["Electrónica", "Accesorios", "Accesorios", "Electrónica", "Accesorios"],
        "Precio Unitario": [1250.00, 25.50, 75.00, 320.00, 65.00],
        "Stock": [12, 150, 80, 25, 45]
    }
    df = pd.DataFrame(data)
    
    # Calcular una columna derivada usando Pandas
    df["Valor Total Inventario"] = df["Precio Unitario"] * df["Stock"]

    # 2. Crear un buffer de memoria y usar pd.ExcelWriter con openpyxl
    excel_buffer = io.BytesIO()
    
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        # Escribir el DataFrame en una hoja llamada 'Inventario'
        df.to_excel(writer, index=False, sheet_name='Inventario')
        
        # 3. Acceder al libro y a la hoja activa para aplicar estilos con openpyxl
        workbook = writer.book
        worksheet = writer.sheets['Inventario']
        
        # Estilos para los encabezados (Fila 1)
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid") # Azul oscuro
        header_font = Font(color="FFFFFF", bold=True, name="Calibri", size=11)
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        for col in range(1, len(df.columns) + 1):
            cell = worksheet.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_alignment

        # 4. Auto-ajustar el ancho de las columnas dinámicamente
        for col in worksheet.columns:
            max_length = 0
            col_letter = get_column_letter(col[0].column)
            
            for cell in col:
                try:
                    if cell.value:
                        max_length = max(max_length, len(str(cell.value)))
                except:
                    pass
            
            # Dar un margen extra de espacio para que no quede apretado
            worksheet.column_dimensions[col_letter].width = max(max_length + 4, 12)

    # Regresar al inicio del buffer en memoria
    excel_buffer.seek(0)

    # 5. Retornar con StreamingResponse
    headers = {
        'Content-Disposition': 'attachment; filename="reporte_inventario_avanzado.xlsx"'
    }
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
    



# Plantilla HTML + CSS para el horario semanal
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page {
        size: letter landscape; /* Hoja horizontal para que quepan bien los 6 días */
        margin: 1cm;
    }
    body {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 9pt;
        color: #333;
    }
    .header {
        text-align: center;
        border-bottom: 2px solid #1F4E78;
        padding-bottom: 8px;
        margin-bottom: 12px;
    }
    .header h1 {
        margin: 0;
        font-size: 14pt;
        color: #1F4E78;
    }
    .header p {
        margin: 2px 0;
        font-size: 9pt;
        color: #555;
    }
    .info-docente {
        width: 100%;
        margin-bottom: 12px;
        background-color: #f4f7fa;
        border: 1px solid #d0d7de;
        padding: 6px;
    }
    .info-docente td {
        padding: 3px 8px;
        font-size: 9pt;
    }
    table.horario {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }
    table.horario th {
        background-color: #1F4E78;
        color: #ffffff;
        padding: 6px;
        font-size: 9pt;
        border: 1px solid #1F4E78;
        text-align: center;
    }
    table.horario td {
        border: 1px solid #cbd5e1;
        padding: 5px;
        vertical-align: top;
        height: 45px;
    }
    .col-hora {
        width: 11%;
        background-color: #f8fafc;
        font-weight: bold;
        text-align: center;
        vertical-align: middle !important;
        color: #1e293b;
    }
    /* Tarjetas según el tipo de actividad */
    .bloque-clase {
        background-color: #e0f2fe;
        border-left: 3px solid #0284c7;
        padding: 4px;
        margin-bottom: 4px;
    }
    .bloque-asesoria {
        background-color: #fef3c7;
        border-left: 3px solid #d97706;
        padding: 4px;
        margin-bottom: 4px;
    }
    .bloque-preparacion {
        background-color: #dcfce7;
        border-left: 3px solid #16a34a;
        padding: 4px;
        margin-bottom: 4px;
    }
    .materia-titulo {
        font-weight: bold;
        font-size: 8.5pt;
        color: #0f172a;
    }
    .detalle-texto {
        font-size: 7.5pt;
        color: #334155;
        margin-top: 2px;
    }
    .footer {
        margin-top: 10px;
        font-size: 7.5pt;
        color: #64748b;
        text-align: right;
    }
</style>
</head>
<body>

    <div class="header">
        <h1>HORARIO ACADÉMICO SEMANAL</h1>
        <p>Período Académico: <strong>{{ periodo }}</strong></p>
    </div>

    <table class="info-docente">
        <tr>
            <td><strong>Docente:</strong> {{ docente }}</td>
            <td><strong>Cédula:</strong> {{ cedula }}</td>
            <td><strong>Contrato:</strong> {{ contrato }}</td>
        </tr>
    </table>

    <table class="horario">
        <thead>
            <tr>
                <th class="col-hora">Horario</th>
                {% for dia in dias %}
                    <th>{{ dia }}</th>
                {% endfor %}
            </tr>
        </thead>
        <tbody>
            {% for bloque, fila in matriz.items() %}
            <tr>
                <td class="col-hora">{{ bloque }}</td>
                {% for dia in dias %}
                    <td>
                        {% for item in fila[dia] %}
                            <div class="{% if item.tipo_actividad == 'Asesoría' %}bloque-asesoria{% elif item.tipo_actividad == 'Preparación' %}bloque-preparacion{% else %}bloque-clase{% endif %}">
                                <div class="materia-titulo">{{ item.cod_materia }} - {{ item.materia }}</div>
                                <div class="detalle-texto">
                                    <strong>PNF:</strong> {{ item.cod_programa }} ({{ item.uc }} UC)<br>
                                    <strong>Lugar:</strong> {{ item.nombre_centro }} - {{ item.espacio_fisico }}<br>
                                    <strong>Actividad:</strong> {{ item.tipo_actividad }}
                                </div>
                            </div>
                        {% endfor %}
                    </td>
                {% endfor %}
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div class="footer">
        Leyenda: Azul = Carga Académica | Ámbar = Asesoría | Verde = Preparación
    </div>

</body>
</html>
"""

@router.get("/Horario_docente/pdf", summary="Descargar horario visual semanal en PDF")
def descargar_horario_docente_pdf(
    cedula: str = Query(..., description="Cédula exacta del docente (ej: V-14567890)"),
    session: Session = Depends(get_session)
):
    # 1. Consultar la vista de horario completo
    query = text("""
        SELECT 
            cedula, nombre_completo_docente, tipo_contrato,
            cod_programa, cod_materia, materia, uc,
            periodo_academico, dia, hora_inicio, hora_fin,
            espacio_fisico, nombre_centro, tipo_actividad
        FROM personas.vw_horario_completo_docente
        WHERE cedula = :cedula
        ORDER BY hora_inicio ASC
    """).params(cedula=cedula)

    resultados = session.exec(query).mappings().all()

    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontró horario asignado para esta cédula.")

    # 2. Procesar con Pandas para armar la matriz semanal
    df = pd.DataFrame([dict(row) for row in resultados])
    
    # Crear etiqueta de rango horario (ej: "08:00 - 10:00")
    df["bloque"] = df["hora_inicio"].astype(str).str[:5] + " - " + df["hora_fin"].astype(str).str[:5]
    
    dias_semana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado","Domingo"]
    bloques_unicos = df["bloque"].unique().tolist()

    # Construir diccionario estructurado: matriz[bloque][dia] = [lista_de_clases]
    matriz = {b: {d: [] for d in dias_semana} for b in bloques_unicos}
    for _, row in df.iterrows():
        dia_nombre = row["dia"].strip().capitalize()
        if dia_nombre in dias_semana:
            matriz[row["bloque"]][dia_nombre].append(row.to_dict())

    # Datos generales del encabezado (tomados del primer registro)
    primer_reg = resultados[0]
    contexto = {
        "docente": primer_reg["nombre_completo_docente"],
        "cedula": primer_reg["cedula"],
        "contrato": primer_reg["tipo_contrato"],
        "periodo": primer_reg["periodo_academico"],
        "dias": dias_semana,
        "matriz": matriz
    }

    # 3. Renderizar HTML con Jinja2
    template = Template(HTML_TEMPLATE)
    html_renderizado = template.render(**contexto)

    # 4. Convertir HTML a PDF en memoria
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(io.StringIO(html_renderizado), dest=pdf_buffer)

    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error al generar el documento PDF.")

    pdf_buffer.seek(0)

    # 5. Devolver el PDF como descarga
    headers = {
        "Content-Disposition": f'attachment; filename="horario_{cedula}.pdf"'
    }
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers=headers
    )