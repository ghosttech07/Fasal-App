import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StepBoard } from '@/components/step-board';

/**
 * Terms, privacy and grievance pages in plain words. Version-dated so a farmer's agreement can be tied to
 * the text they saw. Bracketed items are filled in once the insurer partnership is signed.
 */
const UPDATED = '25 November 2026';

type Doc = { title: string; sub: string; sections: [string, string[]][] };

const DOCS: Record<string, Doc> = {
  terms: {
    title: 'Terms of use',
    sub: 'Version 1 · ' + UPDATED,
    sections: [
      [
        'Who we are',
        [
          'FasalShield is a technology service that helps farmers buy crop cover and receive payouts. The cover itself is issued by an insurance company registered with IRDAI: [INSURER NAME], IRDAI reg. [IRDAI REG. NO.]. Your policy is a contract between you and that insurer.',
          'Pilot notice: until the insurer partnership is signed, covers shown in this app are for demonstration only. No real insurance is issued and no real money is taken or paid.',
        ],
      ],
      [
        'How the cover works',
        [
          'Payouts follow measured rain, not a visit to your field. A satellite and weather data measure rain for the 5 km area around the point you mark as your field. Your own field can get a little more or less rain than that area.',
          'Before you pay, the app shows the rain marks and the money paid at each mark. When rain crosses a mark, the payout is made automatically to your UPI ID. You do not need to file a claim.',
          'In a normal year no payout is made. The premium is not returned when no mark is crossed.',
        ],
      ],
      [
        'What you agree to',
        [
          'The details you give are true: your name, your field location, the acres you farm and the crop you grow. You farm this land as owner or with the owner’s permission.',
          'You insure the same field only once per season.',
          'If the details are false, the insurer can cancel the cover and refuse or recover a payout.',
        ],
      ],
      [
        'Payment and cancellation',
        [
          'You pay your share of the premium by UPI. Any government or sponsor share is shown separately before you pay.',
          'You can cancel within 15 days of buying if the waiting period has not ended and no payout is due; the premium is refunded to the same UPI ID.',
          'Cover starts after the waiting period shown on your policy, so it cannot be bought once dry or heavy rain has already begun.',
        ],
      ],
      [
        'Payouts',
        [
          'Payouts go only to the UPI ID checked in your name. Before a large payout we may ask for an ID check.',
          'Each payout is checked and approved by two people at the insurer before money moves. We aim to pay within 24 hours of the rain data confirming the mark.',
        ],
      ],
      [
        'Your account',
        [
          'Keep your phone and SIM safe; your sign-in code is sent to it. Never share the code with anyone, including people who say they are from FasalShield. We will never ask for it.',
          'We may change these terms. Changes never reduce a cover you already bought; we tell you in the app before they apply.',
        ],
      ],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sub: 'Version 1 · ' + UPDATED,
    sections: [
      [
        'What we collect',
        [
          'Your mobile number, name, village and district; the GPS point and acres of your field; your crop; your UPI ID and the name your bank shows for it; and, only if you choose, an ID number.',
          'We do not read your contacts, messages, photos or other apps.',
        ],
      ],
      [
        'Why we use it',
        [
          'Only to give you cover and pay you: to price the cover for your area, to measure rain for your field, to send payouts to your UPI, and to prevent fraud. We ask for your consent in the app before collecting it, as the Digital Personal Data Protection Act, 2023 requires.',
          'We never sell your data and never use it for advertising.',
        ],
      ],
      [
        'Who sees it',
        [
          'Your insurer and its reinsurer, to issue and pay your cover; the payment provider, to send money; and the regulator, if it asks. Staff see your phone number partly hidden, and every time someone opens your record it is written to a log.',
        ],
      ],
      [
        'How we protect it',
        [
          'Data is encrypted when it travels and when it is stored. Staff sign in with a password and a second check, and money moves only when two people approve it. Data is stored in India once the production setup is complete.',
        ],
      ],
      [
        'Your rights',
        [
          'You can see the data we hold about you, correct it, withdraw consent or ask us to delete it. Write to the grievance officer (see the grievance page). Some records must be kept for the period insurance law requires even after you leave.',
        ],
      ],
    ],
  },
  grievance: {
    title: 'Complaints and grievances',
    sub: 'Version 1 · ' + UPDATED,
    sections: [
      [
        'Tell us first',
        [
          'If a payout did not come, came late, or anything else is wrong, contact our grievance officer: [NAME], grievance@fasalshield.app, [PHONE], Monday to Saturday, 10 am to 6 pm.',
          'Tell us your policy number (it starts with FS-P) and what happened. We reply within 2 working days and aim to solve it within 14 days.',
        ],
      ],
      [
        'If you are not satisfied',
        [
          'You can complain to the insurer: [INSURER NAME], [INSURER GRIEVANCE EMAIL / PHONE].',
          'If the insurer does not solve it within 14 days, you can use IRDAI’s Bima Bharosa portal (bimabharosa.irdai.gov.in) or approach the Insurance Ombudsman for your area, free of charge.',
        ],
      ],
      [
        'Data and privacy complaints',
        [
          'For a complaint about your personal data, write to the grievance officer above. If it is not solved, you can approach the Data Protection Board of India.',
        ],
      ],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const d = DOCS[(await params).doc];
  return { title: d ? `${d.title} · FasalShield` : 'FasalShield' };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <main className="screen">
      <StepBoard back={{ href: '/', label: 'Back' }} title={d.title} sub={d.sub} />
      <div className="work legal">
        {d.sections.map(([h, paras]) => (
          <section key={h}>
            <h2>{h}</h2>
            {paras.map((t) => (
              <p key={t.slice(0, 24)}>{t}</p>
            ))}
          </section>
        ))}
        <nav className="legal-nav" aria-label="Other pages">
          {Object.entries(DOCS)
            .filter(([k]) => k !== doc)
            .map(([k, x]) => (
              <Link key={k} href={`/legal/${k}`}>
                {x.title}
              </Link>
            ))}
        </nav>
      </div>
    </main>
  );
}
