from fastapi import HTTPException, status

def validar_horas(hora_inicio, hora_fin):
    """Valida lógicamente que la hora de inicio sea menor a la hora de fin."""
    if hora_inicio and hora_fin and hora_inicio >= hora_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La hora de inicio no puede ser mayor o igual a la hora de fin."
        )