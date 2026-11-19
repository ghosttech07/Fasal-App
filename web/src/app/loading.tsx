import { SlowHint } from '@/components/slow-hint';

/** Shown instantly on every navigation while the server prepares the next screen: the same shapes, no content. */
export default function Loading() {
  return (
    <main className="screen" aria-busy="true" aria-label="Loading">
      <section className="board">
        <div className="sk sk-d" style={{ width: 120, height: 18 }} />
        <div className="sk sk-d" style={{ width: '70%', height: 32 }} />
        <div className="sk sk-d" style={{ width: '45%', height: 18 }} />
        <div className="sk sk-d" style={{ width: '100%', height: 14, marginTop: 8 }} />
      </section>
      <div className="work">
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-row">
            <div className="sk" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div style={{ display: 'grid', gap: 8, flex: 1 }}>
              <div className="sk" style={{ width: '60%', height: 16 }} />
              <div className="sk" style={{ width: '85%', height: 12 }} />
            </div>
          </div>
        ))}
        <SlowHint />
      </div>
      <div className="action">
        <div className="sk" style={{ height: 56, borderRadius: 8 }} />
      </div>
    </main>
  );
}
