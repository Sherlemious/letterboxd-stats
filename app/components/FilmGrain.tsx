"use client";
const FilmGrain = () => (
  <div
    className="fixed inset-0 pointer-events-none z-50"
    style={{
      opacity: 0.04,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '256px 256px',
      mixBlendMode: 'overlay' as const,
    }}
  />
);

export default FilmGrain;
