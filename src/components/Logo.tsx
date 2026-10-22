// src/components/Logo.tsx
import { useState, type ReactElement } from 'react';

import { useI18n } from '@/i18n';

/** Owner provides this file. The logo is NEVER generated, redrawn or replaced by code. */
export const LOGO_SRC = '/images/logo.png';

type LogoSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: 'h-9',
  md: 'h-11',
  lg: 'h-16',
};

interface LogoProps {
  size?: LogoSize;
  /** Set true when the school name is written next to the logo (hides it from screen readers). */
  decorative?: boolean;
  className?: string;
}

/**
 * Shows public/images/logo.png with its original aspect ratio (object-contain,
 * never cropped or stretched). If the file is missing, shows a neutral text
 * placeholder until the owner adds the logo file.
 */
export function Logo({ size = 'md', decorative = false, className = '' }: LogoProps): ReactElement {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const heightClass = SIZE_CLASSES[size];

  if (failed) {
    return (
      <span
        className={`inline-flex ${heightClass} aspect-square items-center justify-center rounded-md border border-dashed border-current text-[10px] font-semibold tracking-wide opacity-70 ${className}`}
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : t('brand.logoAlt')}
        aria-hidden={decorative ? true : undefined}
      >
        LOGO
      </span>
    );
  }

  return (
    <img
      src={LOGO_SRC}
      alt={decorative ? '' : t('brand.logoAlt')}
      className={`${heightClass} w-auto max-w-none object-contain ${className}`}
      onError={() => setFailed(true)}
      decoding="async"
    />
  );
}

export default Logo;
