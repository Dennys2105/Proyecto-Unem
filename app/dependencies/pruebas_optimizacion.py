from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import Type,Union
from app.config.db_conection import get_session

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