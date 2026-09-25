import { KistasLogo } from './KistasLogo';

export function KistasRouteLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Sayfa yükleniyor"
      className="kistas-route-loader"
    >
      <div className="kistas-route-loader__wrap">
        <div aria-hidden="true" className="kistas-route-loader__aura" />
        <KistasLogo
          size={52}
          showWordmark={false}
          className="kistas-route-loader__logo"
        />
      </div>
      <span className="sr-only">Kıstas sayfası yükleniyor</span>
    </div>
  );
}
