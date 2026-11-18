import type { ReactNode } from 'react';
import isotipo from '../assets/unem-isotipo.png';

interface LogoUnemProps {
  size?: number;
  /** 'tile' = badge blanco para fondos oscuros · 'plain' = transparente para fondos claros */
  variant?: 'tile' | 'plain';
  className?: string;
}

export const LogoUnem = ({
  size = 40,
  variant = 'tile',
  className = '',
}: LogoUnemProps): ReactNode => (
  <span
    className={`unem-logo ${variant === 'tile' ? 'unem-logo-tile' : ''} ${className}`.trim()}
    style={{ width: size, height: size }}
    role="img"
    aria-label="Isotipo oficial UNEM"
  >
    <img src={isotipo} alt="" draggable={false} />
  </span>
);

export default LogoUnem;