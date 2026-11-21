import io
import base64, os
from PIL import Image as PILImage
import pandas as pd
from html import escape
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
from app.dependencies.auth_deps import verificar_permiso, obtener_usuario_actual


router = APIRouter(prefix="/exportar", tags=["Exportar"], dependencies=[Depends(obtener_usuario_actual)])

_MEMBRETE_PATH = os.path.join(os.path.dirname(__file__), '..', 'assets', 'membrete-unem.png')

def _membrete_img(ancho_mm: float = 190.0) -> str:
    """Membrete con proporción real (xhtml2pdf solo respeta width/height)."""
    try:
        with open(_MEMBRETE_PATH, 'rb') as f:
            data = f.read()
        w, h = PILImage.open(io.BytesIO(data)).size
        alto_mm = round(ancho_mm * h / w, 2)
        uri = 'data:image/png;base64,' + base64.b64encode(data).decode()
        return (f'<div style="text-align:center;">'
                f'<img src="{uri}" style="width:{ancho_mm}mm;height:{alto_mm}mm;" />'
                f'</div>')
    except Exception:
        return ''
    
###Exels
@router.get("/exportar-notas", summary="Generar Notas")
def exportar_inventario(
    id_malla: int,
    id_per: int,
    tipo_evaluacion: Optional[str] = Query(None, description="Tipo de evaluación del acta (ej: Final)"),
    id_sec: Optional[int] = Query(None, description="Sección del estudiante (id_sec)"),
    session: Session = Depends(get_session)
):
    # 1. Preparar datos con Pandas
    #    El acta se identifica por MALLA + PERÍODO (no por estudiante).
    sql = """
        SELECT
            e.cedula,
            e.apellido || ', ' || e.nombre AS estudiante,
            n.nota,
            n.tipo_evaluacion,
            n.observaciones,
            n.fecha_registro
        FROM academico.notas n
        INNER JOIN personas.estudiantes e ON n.id_est = e.id_est
        WHERE n.id_malla = :id_malla AND n.id_per = :id_per AND n.estatus = 'A'
    """
    params = {"id_malla": id_malla, "id_per": id_per}
    if tipo_evaluacion:
        sql += " AND n.tipo_evaluacion = :tipo_evaluacion"
        params["tipo_evaluacion"] = tipo_evaluacion
    if id_sec is not None:
        sql += " AND e.id_sec = :id_sec"
        params["id_sec"] = id_sec
    sql += " ORDER BY e.apellido ASC, e.nombre ASC, n.fecha_registro DESC"

    result = session.execute(text(sql), params)
    df = pd.DataFrame(result.fetchall(), columns=result.keys())

    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert(None)

    # Manejar DataFrame vacío por si no hay registros
    if df.empty:
        df = pd.DataFrame(columns=["cedula", "estudiante", "nota", "tipo_evaluacion", "observaciones", "fecha_registro"])

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


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page {
        size: letter landscape; margin: 0.6cm;
        @frame footer_horario {
            -pdf-frame-content: leyenda;
            left: 0.6cm; right: 0.6cm; bottom: 0.6cm; height: 1cm;
        }
    }
    body { font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #222; }
    .header { text-align: center; border-bottom: 2px solid #1F4E78; padding-bottom: 6px; margin-bottom: 10px; }
    .header h1 { margin: 0; font-size: 15pt; color: #1F4E78; }
    .header p  { margin: 2px 0; font-size: 10pt; color: #555; }

    .info-docente { width: 100%; margin-bottom: 10px; background-color: #f4f7fa; }
    .info-docente td { padding: 5px 10px; font-size: 10pt; border: 1px solid #d0d7de; }

    table.horario { width: 100%; }
    table.horario th {
        background-color: #1F4E78; color: #ffffff;
        padding: 6px 4px; font-size: 10pt; border: 1px solid #1F4E78; text-align: center;
    }
    table.horario td {
        border: 1px solid #cbd5e1; padding: 4px; vertical-align: top; height: 70px;
    }
    .col-hora { background-color: #f8fafc; font-weight: bold; text-align: center; font-size: 10pt; }
    .bloque-clase { background-color: #e0f2fe; border-left: 3px solid #0284c7; padding: 4px; margin-bottom: 4px; }
    .bloque-asesoria { background-color: #fef3c7; border-left: 3px solid #d97706; padding: 4px; margin-bottom: 4px; }
    .bloque-preparacion { background-color: #dcfce7; border-left: 3px solid #16a34a; padding: 4px; margin-bottom: 4px; }
    .materia-titulo { font-weight: bold; font-size: 10pt; color: #0f172a; }
    .detalle-texto  { font-size: 9pt; color: #334155; margin-top: 2px; }
    .footer { margin-top: 8px; font-size: 9pt; color: #64748b; text-align: right; }
</style>
</head>
<body>
    <div class="header">
        <h1>HORARIO ACADÉMICO SEMANAL</h1>
        <p>Período Académico: <strong>{{ periodo }}</strong></p>
    </div>

    <table class="info-docente" cellspacing="0" cellpadding="0">
        <tr>
            <td><strong>Docente:</strong> {{ docente }}</td>
            <td><strong>Cédula:</strong> {{ cedula }}</td>
            <td><strong>Contrato:</strong> {{ contrato }}</td>
        </tr>
    </table>

    <table class="horario" cellspacing="0" cellpadding="0">
        <colgroup>
            <col style="width: 10%;" />
            {% for dia in dias %}<col style="width: 15%;" />{% endfor %}
        </colgroup>
        <thead>
            <tr>
                <th>Horario</th>
                {% for dia in dias %}<th>{{ dia }}</th>{% endfor %}
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
                                <div class="materia-titulo">{{ item.materia }}</div>
                                <div class="detalle-texto">{{ item.espacio_fisico }} · {{ item.uc }} UC</div>
                            </div>
                        {% endfor %}
                    </td>
                {% endfor %}
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <div id="leyenda" class="footer">Leyenda: Azul = Carga Académica | Ámbar = Asesoría | Verde = Preparación</div>
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
    
    dias_semana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
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
    html_renderizado = html_renderizado.replace('<body>', '<body>' + _membrete_img(), 1)

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
    query = text("""
        SELECT 
            cedula, nombre_completo_docente, tipo_contrato,
            cod_programa, programa, materia, uc,
            periodo_academico, dia, hora_inicio, hora_fin,
            espacio_fisico, nombre_centro, tipo_actividad
        FROM personas.vw_horario_completo_docente
        WHERE cedula = :cedula
        ORDER BY 
            CASE dia
                WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3
                WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6
            END,
            hora_inicio ASC
    """).params(cedula=cedula)
    resultados = session.exec(query).mappings().all()

    if not resultados:
        raise HTTPException(status_code=404, detail="No se encontraron registros para esta cédula.")

    primer = resultados[0]

    unidades = list(dict.fromkeys(row["materia"] for row in resultados))
    filas = ""
    for row in resultados:
        filas += f"""
            <tr>
                <td><b>{escape(str(row["dia"] or ""))}</b></td>
                <td>{escape(str(row["hora_inicio"] or "")[:5])} - {escape(str(row["hora_fin"] or "")[:5])}</td>
                <td>{escape(str(row["materia"] or ""))}</td>
                <td>{escape(str(row["espacio_fisico"] or ""))} ({escape(str(row["nombre_centro"] or ""))})</td>
                <td>{escape(str(row["tipo_actividad"] or ""))}</td>
            </tr>"""

    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
    <meta charset="UTF-8">
    <style>
        @page {{
            size: letter portrait; margin: 1.2cm;
            @frame footer_ficha {{
                -pdf-frame-content: pie_firma;
                left: 1.2cm; right: 1.2cm; bottom: 1.2cm; height: 3cm;
            }}
        }}
        body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10pt; color: #222; }}
        .header {{ text-align: center; margin-bottom: 12px; }}
        .header h1 {{ font-size: 13pt; color: #1F4E78; margin: 0; }}
        .header h2 {{ font-size: 9pt; color: #555; margin: 2px 0; font-weight: normal; }}
        .header h3 {{ font-size: 11pt; margin: 8px 0 0 0; }}
        .linea {{ border-bottom: 2px solid #1F4E78; margin: 8px 0 12px 0; }}
        table.info {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; }}
        table.info td {{ border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9.5pt; }}
        table.info td.lbl {{ background-color: #f4f7fa; font-weight: bold; width: 22%; }}
        .uc-lista {{ margin-bottom: 14px; }}
        .uc-lista p {{ margin: 2px 0; font-size: 9.5pt; }}
        table.horario {{ width: 100%; border-collapse: collapse; }}
        table.horario th {{ background-color: #1F4E78; color: #fff; padding: 6px; font-size: 9.5pt; border: 1px solid #1F4E78; }}
        table.horario td {{ border: 1px solid #cbd5e1; padding: 5px 6px; font-size: 9.5pt; }}
        .firma {{ margin-top: 6px; text-align: center; font-size: 9pt; }}
        .firma .linea-firma {{ border-top: 1px solid #333; width: 60%; margin: 0 auto 4px auto; }}
        .pie {{ margin-top: 18px; font-size: 8pt; color: #64748b; text-align: center; }}
    </style>
    </head>
    <body>
        <div class="header">

            <h3>FICHA DE ORGANIZACIÓN ACADÉMICA DEL DOCENTE INVESTIGADOR</h3>
        </div>
        <div class="linea"></div>

        <table class="info">
            <tr>
                <td class="lbl">Estado:</td><td>TÁCHIRA</td>
                <td class="lbl">Municipio:</td><td>SAN CRISTÓBAL</td>
            </tr>
            <tr>
                <td class="lbl">Docente:</td><td>{escape(str(primer["nombre_completo_docente"] or ""))}</td>
                <td class="lbl">C.I.:</td><td>{escape(str(primer["cedula"] or ""))}</td>
            </tr>
            <tr>
                <td class="lbl">Contrato:</td><td>{escape(str(primer["tipo_contrato"] or ""))}</td>
                <td class="lbl">Período:</td><td>{escape(str(primer["periodo_academico"] or ""))}</td>
            </tr>
            <tr>
                <td class="lbl">Programa:</td><td colspan="3">{escape(str(primer["programa"] or ""))}</td>
            </tr>
        </table>

        <div class="uc-lista">
            <b style="font-size:10pt;">Unidades Curriculares que imparte:</b>
            {"".join(f'<p>{index + 1}. {escape(str(unidad or ""))}</p>' for index, unidad in enumerate(unidades))}
        </div>

        <b style="font-size:10pt;">Días y ambientes de aprendizaje que atiende:</b>
        <table class="horario">
            <thead>
                <tr>
                    <th>Día</th><th>Horario</th><th>Unidad Curricular</th><th>Aula / Centro</th><th>Actividad</th>
                </tr>
            </thead>
            <tbody>
                {filas}
            </tbody>
        </table>

        <div id="pie_firma">
            <div class="firma">
                <div class="linea-firma"></div>
                Firma del Docente Investigador
            </div>
            <div class="pie">Vicerrectorado Académico Territorial — Generado el {datetime.now().strftime("%d/%m/%Y")}</div>
        </div>
    </body>
    </html>"""

    pdf_buffer = io.BytesIO()
    html = html.replace('<body>', '<body>' + _membrete_img(), 1)
    pisa_status = pisa.CreatePDF(io.StringIO(html), dest=pdf_buffer)
    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error al generar el PDF.")
    pdf_buffer.seek(0)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ficha_docente_{cedula}.pdf"'}
    )