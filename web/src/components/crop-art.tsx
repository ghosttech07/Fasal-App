/** Hand-drawn crop pictures in one stroke weight (board green ink, leaf fill, marigold grain). */
const INK = '#123F2C';
const LEAF = '#D6EBDD';
const GRAIN = '#F5B800';

const ART: Record<string, React.ReactNode> = {
  GRAM: (
    <>
      <path d="M10 34c6-14 18-20 28-20-2 11-12 22-28 20z" fill={LEAF} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="21" cy="27" r="3.2" fill={GRAIN} stroke={INK} strokeWidth="2" />
      <circle cx="28" cy="21.5" r="3.2" fill={GRAIN} stroke={INK} strokeWidth="2" />
      <path d="M10 34 6 40" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  WHEAT: (
    <>
      <path d="M24 44V12" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <g fill={GRAIN} stroke={INK} strokeWidth="2">
        <ellipse cx="19.5" cy="30" rx="3" ry="5.5" transform="rotate(-28 19.5 30)" />
        <ellipse cx="28.5" cy="30" rx="3" ry="5.5" transform="rotate(28 28.5 30)" />
        <ellipse cx="19.5" cy="20" rx="3" ry="5.5" transform="rotate(-28 19.5 20)" />
        <ellipse cx="28.5" cy="20" rx="3" ry="5.5" transform="rotate(28 28.5 20)" />
        <ellipse cx="24" cy="10" rx="3" ry="5.5" />
      </g>
    </>
  ),
  COTTON: (
    <>
      <path d="M24 44V30" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <g fill="#fff" stroke={INK} strokeWidth="2.2">
        <circle cx="18" cy="20" r="7" />
        <circle cx="30" cy="20" r="7" />
        <circle cx="24" cy="13" r="7" />
        <circle cx="24" cy="24" r="6" />
      </g>
      <path d="M15 30c3 3 6 3 9 0 3 3 6 3 9 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  SOYBEAN: (
    <>
      <path d="M14 38c-3-10 4-24 18-28 4 12-4 26-18 28z" fill={LEAF} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      <g fill={GRAIN} stroke={INK} strokeWidth="1.8">
        <circle cx="19" cy="31" r="2.8" />
        <circle cx="23" cy="24" r="2.8" />
        <circle cx="27" cy="17" r="2.8" />
      </g>
    </>
  ),
  TUR: (
    <>
      <path d="M10 30c8 2 20 2 28-8" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 26c6-1 10 3 10 8-6 1-10-3-10-8zM26 20c6-1 10 3 10 8-6 1-10-3-10-8z" fill={LEAF} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="17" cy="30" r="2.2" fill={INK} />
      <circle cx="31" cy="24" r="2.2" fill={INK} />
    </>
  ),
  JOWAR: (
    <>
      <path d="M24 44V24" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 24c-7-2-10-8-8-16 4 1 7 3 8 6 1-3 4-5 8-6 2 8-1 14-8 16z" fill="#E7C27A" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 36c-5 0-9-3-10-7 5 0 9 3 10 7z" fill={LEAF} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </>
  ),
};

export function CropArt({ code }: { code: string }) {
  return (
    <svg className="art" viewBox="0 0 48 48" aria-hidden="true">
      {ART[code] ?? ART.WHEAT}
    </svg>
  );
}
