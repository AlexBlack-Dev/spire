import { useEffect, useState } from 'react';

export const isMobile = new URLSearchParams(window.location.search).has('mobile') || navigator.userAgent.includes('Android');
export const pathSep = isMobile ? '/' : '\\';

export function useViewport(): number {
  const [ih, setIh] = useState(() => window.innerHeight);
  useEffect(() => {
    const handler = () => setIh(window.innerHeight);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return ih;
}

export const dim = {
  navH: 48,
  barH: 44,
  fabSz: 52,
  fabBt: 72,
  dot: 14,
  radius: 12,
  radiusSm: 8,
  radiusLg: 16,
  sp1: 4,
  sp2: 8,
  sp3: 12,
  sp4: 16,
  sp5: 20,
  sp6: 24,
  sp7: 32,
  sp8: 40,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  textXs: 11,
  textSm: 13,
  textMd: 15,
  textLg: 18,
  textXl: 24,
  textXxl: 28,
};
