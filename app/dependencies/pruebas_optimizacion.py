from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Type,Union,Annotated,Optional
from app.config.db_conection import get_session
import re

def validar_unicidad(modelo_db: Type, campos: Union[str, list[str]], nombre_id: str = "id"):
    """
    Fábrica de dependencias para validar unicidad de uno o varios campos.
    Acepta un string (ej: "dia") o una lista de strings (ej: ["codigo", "nombre"]).
    """
    # Si el usuario pasa un solo string, lo convertimos en lista para unificar la lógica
    lista_campos = [campos] if isinstance(campos, str) else campos

    def dependencia(
        datos_in: BaseModel, 
        session: Session = Depends(get_session),
        id: int | None = None 
    ):
        for campo in lista_campos:
            valor = getattr(datos_in, campo, None)

            if valor is not None:
                # Construir la consulta dinámicamente usando el campo actual del bucle
                columna_db = getattr(modelo_db, campo)
                query = select(modelo_db).where(columna_db == valor)

                # Excluir el registro actual si estamos actualizando
                if id is not None:
                    id_columna = getattr(modelo_db, nombre_id)
                    query = query.where(id_columna != id)

                existe = session.exec(query).first()
                if existe:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El campo '{campo}' con valor '{valor}' ya existe."
                    )
                
        return datos_in
    
    return dependencia

def validar_horas(hora_inicio, hora_fin):
    """Valida lógicamente que la hora de inicio sea menor a la hora de fin."""
    if hora_inicio and hora_fin:
        # Quitamos el tzinfo temporalmente para asegurar que ambos sean comparables (naive)
        hi = hora_inicio.replace(tzinfo=None)
        hf = hora_fin.replace(tzinfo=None)

        if hi >= hf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de inicio no puede ser mayor o igual a la hora de fin."
            )


CEDULA_REGEX = re.compile(r"^V-[0-9]{7,8}$")

def validar_cedula_venezolana(cedula: str) -> str:
    """
    Dependencia reutilizable para validar el formato de cédula venezolana.
    """
    if not CEDULA_REGEX.match(cedula):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El formato de la cédula es inválido. Debe cumplir con el estándar V-XXXXXXXX (7 u 8 dígitos)."
        )
    return cedula

def validar_telefono_venezolano(v: Optional[str]) -> Optional[str]:
    if v is None or v == "":
        return None
    # Expresión regular de la BD: 04 seguido de 9 dígitos (ej. 04141234567)
    patron = r"^04[0-9]{9}$"
    if not re.match(patron, v):
        raise HTTPException(
            status_code=422,
            detail="El teléfono debe tener un formato venezolano válido (ej: 04141234567)."
        )
    return v