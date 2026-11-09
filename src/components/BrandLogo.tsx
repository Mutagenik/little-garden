import logoUrl from '../assets/logo.png';
import { useI18n } from '../i18n';
import './BrandLogo.css';

/**
 * The owner's brand logo (Jesenika), shown in the top-right corner of the three main tab
 * screens only: My Room, My Garden and Settings. Source artwork: /logo/Logo.png;
 * src/assets/logo.png is a trimmed 3×-density copy (173×192) for a ~58px-tall display.
 */
export function BrandLogo() {
  const { t } = useI18n();
  return <img className="brand-logo" src={logoUrl} alt={t('app.brandLogoAlt')} width={52} height={58} />;
}
