import io
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status,Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session,text
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment,Border,Side
from openpyxl.utils import get_column_letter
from typing import Optional
from jinja2 import Template
from xhtml2pdf import pisa
from datetime import datetime


from app.config.db_conection import get_session 
from app.dependencies.auth_deps import verificar_permiso


router = APIRouter(prefix="/exportar", tags=["Exportar"])

###Exels
@router.get("/exportar-notas", summary="Generar Notas")
def exportar_inventario(
    id_malla: int, 
    id_per: int, 
    session: Session = Depends(get_session)
):
    # 1. Preparar datos con Pandas
    query = text("""
        SELECT
            e.nombre AS estudiante, 
            n.nota, 
            n.tipo_evaluacion, 
            n.observaciones, 
            n.fecha_registro 
        FROM academico.notas n
        INNER JOIN personas.estudiantes e ON n.id_est = e.id_est
        WHERE n.id_est = :id_est AND n.id_per = :id_per
        ORDER BY e.nombre ASC, n.fecha_registro DESC
    """)
    
    # Nota: Usamos id_est en el dict para que coincida con tu SQL
    result = session.execute(query, {"id_est": id_malla, "id_per": id_per})
    
    df = pd.DataFrame(result.fetchall(), columns=result.keys())
    
    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert(None)
    
    # (Opcional pero recomendado): Manejar DataFrame vacío por si no hay registros
    if df.empty:
        # Puedes retornar un error o un excel vacío según prefieras
        df = pd.DataFrame(columns=["estudiante", "nota", "tipo_evaluacion", "observaciones", "fecha_registro"])

    # 2. Crear un buffer de memoria y usar pd.ExcelWriter con openpyxl
    excel_buffer = io.BytesIO()
    
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Notas')
        
        # 3. Acceder al libro y a la hoja activa para aplicar estilos con openpyxl
        workbook = writer.book
        worksheet = writer.sheets['Notas']
        
        # Estilos para los encabezados (Fila 1)
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
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
            
            worksheet.column_dimensions[col_letter].width = max(max_length + 4, 12)

    # 5. ¡Importante! Rebobinar el buffer al inicio antes de retornarlo
    excel_buffer.seek(0)
    nombre_archivo = f"reporte_notas_{id_malla}_periodo_{id_per}.xlsx"

    # 6. Retornar como StreamingResponse para la descarga en FastAPI
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )
    

@router.get("/estudiantes/seccion/exel", summary= "descargar estudiantes de cada seccion")
def descargar_list_estudiante_exel(
    codigo_seccion: str,
    session:Session = Depends(get_session)
    
):
    query = text("""
        SELECT 
            e.cedula,
            e.nombre,
            e.apellido,
            e.trayecto,
            s.codigo AS seccion_codigo,
            p.nombre AS programa_academico
        FROM personas.estudiantes e
        INNER JOIN academico.secciones s ON e.id_sec = s.id_sec
        LEFT JOIN academico.programas p ON e.id_pro = p.id_pro
        WHERE s.codigo = :codigo_seccion AND e.estatus = 'A'
        ORDER BY e.apellido ASC, e.nombre ASC;
    """)
    result = session.execute(query, {"codigo_seccion": codigo_seccion})
    
    df = pd.DataFrame(result.fetchall(), columns=result.keys())
    
    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert(None)
    
    # (Opcional pero recomendado): Manejar DataFrame vacío por si no hay registros
    if df.empty:
        # Puedes retornar un error o un excel vacío según prefieras
        df = pd.DataFrame(columns=["cedula", "nombre", "apellido", "trayecto", "seccion","programa_academico"])

    # 2. Crear un buffer de memoria y usar pd.ExcelWriter con openpyxl
    excel_buffer = io.BytesIO()
    
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Seccion')
        
        # 3. Acceder al libro y a la hoja activa para aplicar estilos con openpyxl
        workbook = writer.book
        worksheet = writer.sheets['Seccion']
        
        # Estilos para los encabezados (Fila 1)
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
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
            
            worksheet.column_dimensions[col_letter].width = max(max_length + 4, 12)
    # 5. ¡Importante! Rebobinar el buffer al inicio antes de retornarlo
    excel_buffer.seek(0)
    nombre_archivo = f"seccion_{codigo_seccion}.xlsx"

    # 6. Retornar como StreamingResponse para la descarga en FastAPI
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
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
    

@router.get("/ficha-docente-pdf/{cedula}", summary="Generar Ficha de Organización Académica en PDF")
def generar_ficha_docente_pdf(cedula: str, session: Session = Depends(get_session)):
    
    # 1. Consultar los datos del docente y sus asignaciones desde la vista
    query = text("""
        SELECT 
            cedula, nombre_completo_docente, tipo_contrato,
            cod_programa, programa, materia, uc,
            periodo_academico, dia, hora_inicio, hora_fin,
            espacio_fisico, nombre_centro, tipo_actividad
        FROM personas.vw_horario_completo_docente
        WHERE cedula = :cedula
    """)
    resultados = session.execute(query, {"cedula": cedula}).mappings().all()

    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron registros para esta cédula.")

    primer = resultados[0]

    # Extraer unidades curriculares únicas que imparte el docente
    unidades_curriculares = list(set([row["materia"] for row in resultados]))

    # Definir los bloques de hora fijos de la retícula (puedes ajustarlos según tus necesidades)
    horas_base = [
        ("8:30 a 9:15 am.", "08:30:00", "09:15:00"),
        ("9:15 a 10:00 am.", "09:15:00", "10:00:00"),
        ("10:00 a 10:45 am.", "10:00:00", "10:45:00"),
        ("10:45 a 11:30 am.", "10:45:00", "11:30:00"),
        ("11:30 a 12:15 pm.", "11:30:00", "12:15:00"),
        ("12:15 a 1:00 pm.", "12:15:00", "13:00:00"),
        ("1:00 a 2:00 pm.", "13:00:00", "14:00:00"),
        ("2:00 a 2:45 pm.", "14:00:00", "14:45:00"),
        ("02:45 a 3:30 pm.", "14:45:00", "15:30:00"),
        ("03:30 a 4:15 pm.", "15:30:00", "16:15:00"),
        ("04:15 a 5:00 pm.", "16:15:00", "17:00:00"),
    ]

    # Mapear las clases de la BD a los bloques de Viernes y Sábado
    bloques_horario = []
    for etiqueta, h_ini, h_fin in horas_base:
        viernes_texto = ""
        sabado_texto = ""
        
        for row in resultados:
            # Comparamos si la hora coincide y el día corresponde
            r_ini = str(row["hora_inicio"])
            r_fin = str(row["hora_fin"])
            dia = row["dia"].strip().capitalize()
            
            if r_ini <= h_ini and r_fin >= h_fin:
                contenido = f"<b>{row['materia']}</b><br/><font size='6'>{row['espacio_fisico']}</font>"
                if dia == "Viernes":
                    viernes_texto = contenido
                elif dia == "Sábado" or dia == "Sabado":
                    sabado_texto = contenido

        bloques_horario.append({
            "hora": etiqueta,
            "viernes": viernes_texto,
            "sabado": sabado_texto
        })

    # 2. Preparar el contexto para Jinja2
    contexto = {
        "estado": "TÁCHIRA",
        "municipio": "SAN CRISTÓBAL",
        "aula_taller": primer.get("nombre_centro", "E.B ASISCLO BUSTAMANTE"),
        "periodo": primer["periodo_academico"],
        "programa": primer["programa"],
        "cohorte": "2023",
        "trayecto": "III",
        "semestre": "VII",
        "bachilleres": "",
        "unidades_curriculares": unidades_curriculares,
        "docente": primer["nombre_completo_docente"],
        "cedula": primer["cedula"],
        "correo": "No registrado", # O puedes agregarlo a la vista si lo tienes en otra tabla
        "telefono": "No registrado",
        "fecha_entrega": datetime.now().strftime("%d/%0m/%Y"),
        "bloques_horario": bloques_horario,
        "tipo_contrato": primer["tipo_contrato"],
        "total_horas": "05" # O calcularlo dinámicamente según las horas asignadas
    }

    # 3. Leer la plantilla HTML externa
    template_path = Path("app/templates/ficha_docente.html")
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="No se encontró la plantilla HTML.")
    
    html_template_string = template_path.read_text(encoding="utf-8")

    # 4. Renderizar y convertir a PDF
    template = Template(html_template_string)
    html_renderizado = template.render(**contexto)

    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(io.BytesIO(html_renderizado.encode("utf-8")), dest=pdf_buffer)
    
    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error al generar el PDF.")

    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ficha_docente_{cedula}.pdf"}
    )