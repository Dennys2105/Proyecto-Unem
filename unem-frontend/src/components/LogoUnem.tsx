import { useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Isotipo oficial UNEM · Universidad Nacional Experimental del Magisterio
 * "Samuel Robinson" — Sede Táchira.
 *
 * Se sirve desde public/unem-isotipo.png (runtime, sin import de build).
 * Si el archivo no existiera, se degrada a un monograma SVG con los tres
 * colores oficiales del isotipo:
 *   índigo profundo #2E2A60 · periwinke #7C7CC9 · azul #009FE3
 */
const RUTA_LOGO = '/unem-isotipo.png';

/* Colores oficiales leídos del isotipo */
const TINTA = '#2E2A60';
const LILA = '#7C7CC9';
const CIELO = '#009FE3';

interface LogoUnemProps {
  size?: number;
  /** 'tile' = badge blanco para fondos oscuros · 'plain' = transparente */
  variant?: 'tile' | 'plain';
  className?: string;
}

/** Monograma de respaldo: la "U" del isotipo con sus 3 arcos concéntricos. */
const MonogramaRespaldo = (): ReactNode => (
  <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
    <path d="M12 10 V34 A20 20 0 0 0 52 34 V10" fill="none" stroke={TINTA} strokeWidth="5.5" strokeLinecap="round" />
    <path d="M19 12 V34 A13 13 0 0 0 45 34 V16" fill="none" stroke={LILA} strokeWidth="5.5" strokeLinecap="round" />
    <path d="M26 14 V34 A6 6 0 0 0 38 34 V22"  fill="none" stroke={CIELO} strokeWidth="5.5" strokeLinecap="round" />
  </svg>
);

export const LogoUnem = ({
  size = 40,
  variant = 'tile',
  className = '',
}: LogoUnemProps): ReactNode => {
  const [sinImagen, setSinImagen] = useState(false);

  return (
    <span
      className={`unem-logo ${variant === 'tile' ? 'unem-logo-tile' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Isotipo oficial UNEM"
    >
      {sinImagen ? (
        <MonogramaRespaldo />
      ) : (
        <img
          src={RUTA_LOGO}
          alt=""
          draggable={false}
          onError={() => setSinImagen(true)}
        />
      )}
    </span>
  );
};

export default LogoUnem;