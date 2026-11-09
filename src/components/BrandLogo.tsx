import logoUrl from '../assets/logo.png';
import { useI18n } from '../i18n';
import './BrandLogo.css';

export const BRAND_URL = 'https://jesenika.cz/';

/**
 * The owner's brand logo (Jesenika), shown in the top-right corner of the three main tab
 * screens only: My Room, My Garden and Settings. Tapping it opens jesenika.cz in a new tab
 * (in the installed app: in the phone's browser). The link has no visible link styling.
 * Source artwork: /logo/Logo.png (lavender). src/assets/logo.png is a trimmed 173×192 copy
 * recoloured to the button green (--sage, #7f9a73), shown 52px wide.
 */
export function BrandLogo() {
  const { t } = useI18n();
  return (
    <a className="brand-logo" href={BRAND_URL} target="_blank" rel="noopener noreferrer" aria-label={t('app.brandLinkLabel')}>
      <img className="brand-logo__img" src={logoUrl} alt="" width={52} height={58} draggable={false} />
    </a>
  );
}
