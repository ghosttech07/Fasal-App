import { Droplet } from 'lucide-react';

/** Product name as painted on the board. */
export function Mark() {
  return (
    <div className="mark">
      <Droplet size={20} strokeWidth={2} aria-hidden="true" color="var(--marigold)" fill="var(--marigold)" />
      <span>FasalShield</span>
    </div>
  );
}
