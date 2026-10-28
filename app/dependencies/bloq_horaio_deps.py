from fastapi import HTTPException, status

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