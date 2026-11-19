export type Fix = { lat: number; lng: number; accuracyM: number };

/**
 * Reads GPS for up to `ms` and returns an accuracy-weighted average of the fixes (weight 1/accuracy²),
 * reported with the best single-fix accuracy (conservative: averaging is usually better than that).
 * Ends early once 6 fixes under 15 m are in.
 */
export function averagedFix(ms = 12_000, onProgress?: (best: number) => void): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    const fixes: Fix[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watch);
      clearTimeout(timer);
      if (!fixes.length) return reject(new Error('no_fix'));
      let w = 0,
        lat = 0,
        lng = 0;
      for (const f of fixes) {
        const k = 1 / (f.accuracyM * f.accuracyM);
        w += k;
        lat += f.lat * k;
        lng += f.lng * k;
      }
      resolve({
        lat: lat / w,
        lng: lng / w,
        accuracyM: Math.min(...fixes.map((f) => f.accuracyM)),
      });
    };
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        fixes.push({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracyM: Math.max(1, p.coords.accuracy),
        });
        onProgress?.(Math.min(...fixes.map((f) => f.accuracyM)));
        if (fixes.filter((f) => f.accuracyM < 15).length >= 6) finish();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          done = true;
          navigator.geolocation.clearWatch(watch);
          clearTimeout(timer);
          reject(new Error('denied'));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: ms },
    );
    const timer = setTimeout(finish, ms);
  });
}
