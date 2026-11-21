import type { ComponentType, ReactNode } from 'react';

interface PageHeroProps {
  icon: ComponentType<{ size?: number | string }>;
  titulo: string;
  descripcion: ReactNode;
  acciones?: ReactNode;
}

/** Encabezado institucional UNEM: isotipo-tipográfico + acento de la paleta del logo. */
export const PageHero = ({ icon: Icon, titulo, descripcion, acciones }: PageHeroProps): ReactNode => (
  <section className="unem-hero">
    <div className="unem-hero-row">
      <div style={{ display: 'flex', gap: 15, minWidth: 0 }}>
        <span className="unem-hero-ico"><Icon size={22} /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{titulo}</h1>
          <p>{descripcion}</p>
        </div>
      </div>
      {acciones}
    </div>
  </section>
);

export default PageHero;