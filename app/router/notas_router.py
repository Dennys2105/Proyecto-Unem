from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.dependencies.auth_deps import verificar_permiso
# from app.database import get_session  # Tu dependencia para obtener la sesión de BD

router = APIRouter(prefix="/api/notas", tags=["Notas"])

@router.get("/")
def listar_notas(
    # 1. Exigimos el nivel mínimo de acceso necesario para entrar a la ruta: 'SP' (Solo Propietario)
    auth_data: dict = Depends(verificar_permiso(modulo="notas", accion="LEC", alcance_requerido="SP")),
    # session: Session = Depends(get_session) # Tu sesión de base de datos
):
    """Funcion de prueba para las protencion de seguridad de la ruta de notas, se puede eliminar despues de las pruebas"""
    id_usuario_actual = auth_data["id_usu"]
    alcance = auth_data["alcance"] # Puede ser "TODO", "LIM", "SP", etc.
    
    # 2. Creamos la consulta base (statement)
    # statement = select(Nota) 
    
    # 3. Aplicamos el filtro condicional basado en el alcance que arrojó la seguridad
    if alcance == "TODO":
        # El Administrador o Coordinador ve absolutamente todas las notas del sistema
        print(f"Usuario {id_usuario_actual} con alcance TODO: consultando todas las notas...")
        # notas = session.exec(statement).all()
        
    elif alcance == "SP":
        # El Docente (o estudiante) con alcance 'Solo Propietario' filtra estrictamente por lo suyo
        print(f"Usuario {id_usuario_actual} con alcance SP: filtrando notas del docente...")
        # statement = statement.where(Nota.id_docente == id_usuario_actual)
        # notas = session.exec(statement).all()
        
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Alcance insuficiente para procesar esta solicitud."
        )
        
    return {
        "mensaje": "Consulta de notas exitosa",
        "alcance_aplicado": alcance,
        "usuario_ejecutor": id_usuario_actual,
        # "resultados": notas
    }