from typing import Type, TypeVar, List, Optional
from sqlmodel import SQLModel, Session, select
from pydantic import BaseModel

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

# --- 1. CREAR ---
def crear_registro(db: Session, modelo: Type[ModelType], datos_in: CreateSchemaType) -> ModelType:
    db_obj = modelo.model_validate(datos_in)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

# --- 2. LEER TODOS LOS ACTIVOS ---
def obtener_todos_activos(db: Session, modelo: Type[ModelType]) -> List[ModelType]:
    statement = select(modelo).where(modelo.estatus == "A")
    return db.exec(statement).all()

# --- 3. LEER UNO POR ID ---
def obtener_por_id(db: Session, modelo: Type[ModelType], id: int) -> Optional[ModelType]:
    db_obj = db.get(modelo, id)
    if not db_obj or not getattr(db_obj, "estatus", "A"):
        return None
    return db_obj

# --- 4. ACTUALIZAR (PATCH O PUT) ---
def actualizar_registro(
    db: Session, 
    db_obj: ModelType, 
    datos_in: UpdateSchemaType, 
    parcial: bool = True
) -> ModelType:
    datos_nuevos = datos_in.model_dump(exclude_unset=parcial)
    for llave, valor in datos_nuevos.items():
        setattr(db_obj, llave, valor)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


# --- 5. ELIMINACIÓN LÓGICA ---
def eliminar_logico(db: Session, db_obj: ModelType) -> None:
    db_obj.estatus = "I"
    db.add(db_obj)
    db.commit()