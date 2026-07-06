export const isMobile = new URLSearchParams(window.location.search).has('mobile') || navigator.userAgent.includes('Android');
export const pathSep = isMobile ? '/' : '\\';

function rnd(v: number) { return Math.round(v); }

export const dim = {
  get navH() { return rnd(Math.max(44, Math.min(60, window.innerHeight * 0.07))); },
  get barH() { return rnd(Math.max(40, Math.min(52, window.innerHeight * 0.06))); },
  get fabSz() { return rnd(Math.max(42, Math.min(56, window.innerWidth * 0.13))); },
  get fabBt() { return rnd(Math.max(56, Math.min(80, window.innerHeight * 0.09))); },
  get dot() { return rnd(Math.max(12, Math.min(20, window.innerWidth * 0.045))); },
  get radius() { return rnd(Math.max(8, Math.min(14, window.innerWidth * 0.03))); },
  get radiusSm() { return rnd(Math.max(6, Math.min(12, window.innerWidth * 0.025))); },
  get radiusLg() { return rnd(Math.max(12, Math.min(20, window.innerWidth * 0.045))); },
  get sp1() { return rnd(Math.max(2, Math.min(6, window.innerWidth * 0.008))); },
  get sp2() { return rnd(Math.max(4, Math.min(8, window.innerWidth * 0.015))); },
  get sp3() { return rnd(Math.max(6, Math.min(12, window.innerWidth * 0.022))); },
  get sp4() { return rnd(Math.max(8, Math.min(14, window.innerWidth * 0.03))); },
  get sp5() { return rnd(Math.max(10, Math.min(16, window.innerWidth * 0.036))); },
  get sp6() { return rnd(Math.max(12, Math.min(20, window.innerWidth * 0.042))); },
  get sp7() { return rnd(Math.max(14, Math.min(26, window.innerWidth * 0.052))); },
  get sp8() { return rnd(Math.max(16, Math.min(30, window.innerWidth * 0.058))); },
  get iconSm() { return rnd(Math.max(12, Math.min(18, window.innerWidth * 0.035))); },
  get iconMd() { return rnd(Math.max(16, Math.min(24, window.innerWidth * 0.05))); },
  get iconLg() { return rnd(Math.max(20, Math.min(30, window.innerWidth * 0.06))); },
  get textXs() { return rnd(Math.max(9, Math.min(12, window.innerWidth * 0.028))); },
  get textSm() { return rnd(Math.max(11, Math.min(14, window.innerWidth * 0.034))); },
  get textMd() { return rnd(Math.max(13, Math.min(16, window.innerWidth * 0.04))); },
  get textLg() { return rnd(Math.max(16, Math.min(22, window.innerWidth * 0.052))); },
  get textXl() { return rnd(Math.max(20, Math.min(28, window.innerWidth * 0.065))); },
  get textXxl() { return rnd(Math.max(24, Math.min(34, window.innerWidth * 0.08))); },
};
