from typing import Optional


NOTA_MINIMA_REGULAR = 12
NOTA_MINIMA_PROYECTO = 16
SQL_NOTA_MINIMA_APROBATORIA = (
    "CASE WHEN LOWER(BTRIM(eje.nombre)) = 'proyecto' THEN 16 ELSE 12 END"
)


def nota_minima_aprobatoria(eje_nombre: Optional[str]) -> int:
    if eje_nombre and eje_nombre.strip().casefold() == "proyecto":
        return NOTA_MINIMA_PROYECTO
    return NOTA_MINIMA_REGULAR
