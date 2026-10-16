from fastapi import Depends, HTTPException, status, Path
from sqlmodel import Session, select
from app.config.db_conection import get_session
from app.models.unem_db_models import Municipio
from pydantic import BaseModel

def validar_codigo_unico(
    datos_in: BaseModel, 
    session: Session = Depends(get_session),
    # Opcional: si la ruta incluye el ID (como en PUT o PATCH /programas/{id})
    id: int | None = None 
):
    nombre = getattr(datos_in, "nombre", None)
    
    if nombre:
        # Construimos la consulta base
        query = select(Municipio).where(Municipio.nombre == nombre)
        
        # Si estamos actualizando (tenemos un ID), excluimos al propio registro de la búsqueda
        if id is not None:
            query = query.where(Municipio.id_mun != id)
            
        existe = session.exec(query).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El Municipio '{nombre}' ya existe."
            )
            
    return datos_in