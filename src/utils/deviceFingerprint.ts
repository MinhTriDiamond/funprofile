export async function getDeviceHash(): Promise<string> {
  const raw = [
    screen.width, screen.height, screen.colorDepth,
    navigator.language, navigator.platform,
    navigator.hardwareConcurrency,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
