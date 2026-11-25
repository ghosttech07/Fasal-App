'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CropArt } from '@/components/crop-art';
import { FormError } from '@/components/form-error';
import { StepBoard } from '@/components/step-board';
import { get, messageFor } from '@/lib/client';
import { en } from '@/lib/format';
import { useT } from '@/i18n/client';
import type { Key } from '@/i18n';

type Crop = { code: string; namesI18n: unknown };
type Season = { code: string; namesI18n: unknown };
type Plot = { id: string };

const ORDER = ['GRAM', 'WHEAT', 'JOWAR', 'TUR', 'SOYBEAN', 'COTTON'];

export default function CropPage() {
  const router = useRouter();
  const { t, lang } = useT();
  const cropName = (c: Crop) => {
    const k = `crop.${c.code}` as Key;
    const s = t(k);
    return s === k ? en(c.namesI18n) : s;
  };
  const [crops, setCrops] = useState<Crop[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      get<Crop[]>('/api/fs/catalog/crops'),
      get<Season[]>('/api/fs/catalog/seasons'),
      get<Plot[]>('/api/fs/me/plots'),
    ])
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
      <StepBoard back={{ href: '/', label: t('c.home') }} title={t('crop.title')} />
      <div className="work" style={{ gap: 14 }}>
        <div className="crops" role="group" aria-label="Crop">
          {crops.map((c) => (
            <button
              key={c.code}
              type="button"
              className="crop"
              aria-pressed={crop === c.code}
              onClick={() => setCrop(c.code)}
            >
              {crop === c.code ? (
                <span className="ok">
                  <Check size={16} aria-hidden="true" />
                </span>
              ) : null}
              <CropArt code={c.code} />
              {cropName(c)}
            </button>
          ))}
        </div>
        <div>
          <span className="label" id="season-label">
            {t('crop.season')}
          </span>
          <div className="chips" role="group" aria-labelledby="season-label">
            {seasons.map((s) => (
              <button
                key={s.code}
                type="button"
                className="chip"
                aria-pressed={season === s.code}
                onClick={() => setSeason(s.code)}
              >
                {season === s.code ? <Check size={16} aria-hidden="true" /> : null}
                {(s.namesI18n as Record<string, string>)?.[lang] ?? en(s.namesI18n)}
              </button>
            ))}
          </div>
        </div>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <div className="action">
        <button
          className="btn"
          type="button"
          disabled={!crop || !season || !plot}
          onClick={() =>
            router.push(`/cover/choose?crop=${crop}&season=${season}&plot=${plot!.id}`)
          }
        >
          {name
            ? t('crop.see', { crop: cropName(name).replace(/ \(.*\)$/, '') })
            : t('crop.choose')}
          <ArrowRight size={22} aria-hidden="true" />
        </button>
      </div>
    </main>
  );
}
