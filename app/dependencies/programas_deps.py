from fastapi import Depends, HTTPException, status, Path
from sqlmodel import Session, select
from app.config.db_conection import get_session
from app.models.unem_db_models import Programa
from pydantic import BaseModel

def validar_codigo_unico(
    datos_in: BaseModel, 
    session: Session = Depends(get_session),
    # Opcional: si la ruta incluye el ID (como en PUT o PATCH /programas/{id})
    id: int | None = None 
):
    codigo = getattr(datos_in, "codigo", None)
    
    if codigo:
        # Construimos la consulta base
        query = select(Programa).where(Programa.codigo == codigo)
        
        # Si estamos actualizando (tenemos un ID), excluimos al propio registro de la búsqueda
        if id is not None:
            query = query.where(Programa.id_pro != id)
            
        existe = session.exec(query).first()
        if existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El código '{codigo}' ya está asignado a otro programa."
            )
            
    return datos_in