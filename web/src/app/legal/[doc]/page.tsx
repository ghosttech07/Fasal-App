import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StepBoard } from '@/components/step-board';
import { getT } from '@/i18n/server';
import { LEGAL, LEGAL_UPDATED, LEGAL_VERSION } from '@/legal';
import { day } from '@/lib/format';

/**
 * Terms, privacy and grievance pages in plain words, in the farmer's language. Version-dated so a farmer's
 * agreement can be tied to the text they saw; translations say the English text is the binding one.
 */
type Key = keyof (typeof LEGAL)['en']['docs'];
const isKey = (k: string): k is Key => k in LEGAL.en.docs;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!isKey(doc)) return { title: 'FasalShield' };
  const { lang } = await getT();
  return { title: `${LEGAL[lang].docs[doc].title} · FasalShield` };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isKey(doc)) notFound();
  const { t, lang } = await getT();
  const set = LEGAL[lang];
  const d = set.docs[doc];
  return (
    <main className="screen">
      <StepBoard
        back={{ href: '/', label: t('c.back') }}
        title={d.title}
        sub={`${set.version} ${LEGAL_VERSION} · ${day(LEGAL_UPDATED, true, lang)}`}
      />
      <div className="work legal">
        {set.note ? <p className="legal-note">{set.note}</p> : null}
        {d.sections.map(([h, paras]) => (
          <section key={h}>
            <h2>{h}</h2>
            {paras.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </section>
        ))}
        <nav className="legal-nav">
          {(Object.keys(set.docs) as Key[])
            .filter((k) => k !== doc)
            .map((k) => (
              <Link key={k} href={`/legal/${k}`}>
                {set.docs[k].title}
              </Link>
            ))}
        </nav>
      </div>
    </main>
  );
}
