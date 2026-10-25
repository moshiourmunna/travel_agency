'use client';
import { useEffect, useState } from 'react';

/** Trip-type radios; one-way disables the return date, multi-city shows the agent-assisted note. */
export function TripForm({ initial, returnId, l, mcNote, children }: { initial: string; returnId: string; l: Record<'rt' | 'ow' | 'mc' | 'aria', string>; mcNote: React.ReactNode; children: React.ReactNode }) {
  const [trip, setTrip] = useState(initial);
  useEffect(() => {
    const el = document.getElementById(returnId) as HTMLInputElement | null;
    if (el) el.disabled = trip === 'ow';
  }, [trip, returnId]);
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4 text-sm font-semibold" role="radiogroup" aria-label={l.aria}>
        {(['rt', 'ow', 'mc'] as const).map((v) => <label key={v} className="flex items-center gap-2"><input type="radio" name="trip" value={v} className="check rounded-full" checked={trip === v} onChange={() => setTrip(v)} /> {l[v]}</label>)}
      </div>
      {children}
      {trip === 'mc' ? <div className="mt-3" role="status">{mcNote}</div> : null}
    </>
  );
}
