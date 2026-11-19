'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CropArt } from '@/components/crop-art';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor } from '@/lib/client';
import { en } from '@/lib/format';

type Crop = { code: string; namesI18n: unknown };
type Season = { code: string; namesI18n: unknown };
type Plot = { id: string };

const ORDER = ['GRAM', 'WHEAT', 'JOWAR', 'TUR', 'SOYBEAN', 'COTTON'];

export default function CropPage() {
  const router = useRouter();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([get<Crop[]>('/api/fs/catalog/crops'), get<Season[]>('/api/fs/catalog/seasons'), get<Plot[]>('/api/fs/me/plots')])
      .then(([c, s, p]) => {
        setCrops([...c].sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code)));
        setSeasons(s);
        setSeason(s[0]?.code ?? null);
        setPlot(p[0] ?? null);
      })
      .catch((e) => setError(messageFor(e)));
  }, []);

  const name = crops.find((c) => c.code === crop);
  return (
    <main className="screen">
      <StepBoard back={{ href: '/', label: 'Home' }} title="Which crop is in your field" />
      <div className="work" style={{ gap: 14 }}>
        <div className="crops" role="group" aria-label="Crop">
          {crops.map((c) => (
            <button key={c.code} type="button" className="crop" aria-pressed={crop === c.code} onClick={() => setCrop(c.code)}>
              {crop === c.code ? (
                <span className="ok">
                  <Check size={16} aria-hidden="true" />
                </span>
              ) : null}
              <CropArt code={c.code} />
              {en(c.namesI18n)}
            </button>
          ))}
        </div>
        <div>
          <span className="label" id="season-label">
            Season
          </span>
          <div className="chips" role="group" aria-labelledby="season-label">
            {seasons.map((s) => (
              <button key={s.code} type="button" className="chip" aria-pressed={season === s.code} onClick={() => setSeason(s.code)}>
                {season === s.code ? <Check size={16} aria-hidden="true" /> : null}
                {en(s.namesI18n)}
              </button>
            ))}
          </div>
        </div>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <div className="action">
        <button className="btn" type="button" disabled={!crop || !season || !plot} onClick={() => router.push(`/cover/choose?crop=${crop}&season=${season}&plot=${plot!.id}`)}>
          {name ? `See covers for ${en(name.namesI18n).replace(/ \(.*\)$/, '').toLowerCase()}` : 'Choose a crop'}
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
