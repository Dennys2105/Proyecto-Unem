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
    
    result = session.execute(query, {"id_est": id_malla, "id_per": id_per})
    
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontro conincidencias")
    
    df = pd.DataFrame(result.fetchall(), columns=result.keys())
    
    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert(None)
    

    if df.empty:
        df = pd.DataFrame(columns=["estudiante", "nota", "tipo_evaluacion", "observaciones", "fecha_registro"])

    excel_buffer = io.BytesIO()
    
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Notas')

        workbook = writer.book
        worksheet = writer.sheets['Notas']
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, name="Calibri", size=11)
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        for col in range(1, len(df.columns) + 1):
            cell = worksheet.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_alignment

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
            
    excel_buffer.seek(0)
    nombre_archivo = f"reporte_notas_{id_malla}_periodo_{id_per}.xlsx"

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
    
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontro conincidencias")
    
    df = pd.DataFrame(result.fetchall(), columns=result.keys())
    
    for col in df.columns:
        if pd.api.types.is_datetime64tz_dtype(df[col]):
            df[col] = df[col].dt.tz_convert(None)

    if df.empty:

        df = pd.DataFrame(columns=["cedula", "nombre", "apellido", "trayecto", "seccion","programa_academico"])


    excel_buffer = io.BytesIO()
    
    with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Seccion')
        
        workbook = writer.book
        worksheet = writer.sheets['Seccion']
        
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, name="Calibri", size=11)
        header_alignment = Alignment(horizontal="center", vertical="center")
        
        for col in range(1, len(df.columns) + 1):
            cell = worksheet.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = header_alignment

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

    excel_buffer.seek(0)
    nombre_archivo = f"seccion_{codigo_seccion}.xlsx"

    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )

@router.get("/Horario_docente/pdf", summary="Descargar horario visual semanal en PDF")
def descargar_horario_docente_pdf(
    cedula: str = Query(..., description="Cédula exacta del docente (ej: V-14567890)"),
    session: Session = Depends(get_session)
):
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

    df = pd.DataFrame([dict(row) for row in resultados])
    

    df["bloque"] = df["hora_inicio"].astype(str).str[:5] + " - " + df["hora_fin"].astype(str).str[:5]
    
    dias_semana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    bloques_unicos = df["bloque"].unique().tolist()

    # Construir diccionario estructurado: matriz[bloque][dia] = [lista_de_clases]
    matriz = {b: {d: [] for d in dias_semana} for b in bloques_unicos}
    for _, row in df.iterrows():
        dia_nombre = row["dia"].strip().capitalize()
        if dia_nombre in dias_semana:
            matriz[row["bloque"]][dia_nombre].append(row.to_dict())


    primer_reg = resultados[0]
    contexto = {
        "docente": primer_reg["nombre_completo_docente"],
        "cedula": primer_reg["cedula"],
        "contrato": primer_reg["tipo_contrato"],
        "periodo": primer_reg["periodo_academico"],
        "dias": dias_semana,
        "matriz": matriz
    }

    template_path = Path("app/templates/horario_semanal.html")
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="No se encontró la plantilla HTML del horario.")
    
    html_template_string = template_path.read_text(encoding="utf-8")

    template = Template(html_template_string)
    html_renderizado = template.render(**contexto)

    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(io.BytesIO(html_renderizado.encode("utf-8")), dest=pdf_buffer)

    if pisa_status.err:
        raise HTTPException(status_code=500, detail="Error al generar el documento PDF.")

    pdf_buffer.seek(0)

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
                vw.cedula, 
                vw.nombre_completo_docente, 
                vw.tipo_contrato,
                vw.cod_programa, 
                vw.programa, 
                vw.materia, 
                vw.uc,
                vw.periodo_academico, 
                vw.dia, 
                vw.hora_inicio, 
                vw.hora_fin,
                vw.espacio_fisico, 
                vw.nombre_centro, 
                vw.tipo_actividad, 
                d.telefono,
                u.email AS correo,
                m.trayecto,
                m.periodo AS semestre
            FROM personas.vw_horario_completo_docente vw
            JOIN personas.docentes d ON vw.cedula = d.cedula
            LEFT JOIN general.usuarios u ON d.id_usu = u.id_usu
            -- Cruzamos la malla curricular mediante la asignación y la materia de la vista si es estrictamente necesario,
            -- o confiamos en los datos de la vista. Aquí cruzamos de forma segura por docente y materia:
            LEFT JOIN horarios.asig_carga_horarias ach ON d.id_doc = ach.id_doc
            LEFT JOIN academico.malla_curricular m ON ach.id_malla = m.id_malla
            WHERE vw.cedula = :cedula;
        """)
    resultados = session.execute(query, {"cedula": cedula}).mappings().all()

    if not resultados:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontraron registros para esta cédula.")

    primer = resultados[0]

    unidades_curriculares = list(set([row["materia"] for row in resultados]))

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
    
    

    bloques_horario = []
    total_horas_acumuladas = 0.0
    for etiqueta, h_ini, h_fin in horas_base:
        viernes_texto = ""
        sabado_texto = ""
        
        for row in resultados:
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

    for row in resultados:
        if row["hora_inicio"] and row["hora_fin"]:
            dt_inicio = datetime.combine(
                datetime.today(),
                (
                    row["hora_inicio"]
                    if hasattr(row["hora_inicio"], "hour")
                    else datetime.strptime(str(row["hora_inicio"]), "%H:%M:%S").time()
                ),
            )
            dt_fin = datetime.combine(
                datetime.today(),
                (
                    row["hora_fin"]
                    if hasattr(row["hora_fin"], "hour")
                    else datetime.strptime(str(row["hora_fin"]), "%H:%M:%S").time()
                ),
            )
            total_horas_acumuladas += (dt_fin - dt_inicio).total_seconds() / 3600

    contexto = {
            "estado": "TÁCHIRA",
            "municipio": "SAN CRISTÓBAL",
            "aula_taller": primer.get("nombre_centro", "E.B ASISCLO BUSTAMANTE"),
            "periodo": primer["periodo_academico"],
            "programa": primer["programa"],
            "cohorte": "2023",  # OJO: No encuentro si hay cohorte en la BD si es el caso toca borrar este campo
            "trayecto": (
                str(primer.get("trayecto", "III"))
                if primer.get("trayecto")
                else "III"
            ),
            "semestre": (
                str(primer.get("semestre", "VII"))
                if primer.get("semestre")
                else "VII"
            ),
            "bachilleres": "",
            "unidades_curriculares": unidades_curriculares,
            "docente": primer["nombre_completo_docente"],
            "cedula": primer["cedula"],
            "correo": primer.get("correo") or "No registrado",
            "telefono": primer.get("telefono") or "No registrado",
            "fecha_entrega": datetime.now().strftime("%d/%m/%Y"),
            "bloques_horario": bloques_horario,
            "tipo_contrato": primer["tipo_contrato"],
            "total_horas": f"{total_horas_acumuladas:.1f}",
        }

    template_path = Path("app/templates/ficha_docente.html")
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="No se encontró la plantilla HTML.")
    
    html_template_string = template_path.read_text(encoding="utf-8")

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