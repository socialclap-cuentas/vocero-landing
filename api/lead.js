// Registro del chat guiado de oferta.socialclap.agency.
// No guarda nada acá: reenvía el registro a la función que ya valida y escribe en el CRM
// (turnomaster.app/api/lead), para que las claves vivan en un solo lugar.
const ALLOWED_HOSTS = ['oferta.socialclap.agency'];
const TARGET = 'https://turnomaster.app/api/lead';

function hostOk(req) {
  const src = req.headers.origin || req.headers.referer || '';
  try { return ALLOWED_HOSTS.includes(new URL(src).hostname); } catch (e) { return false; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!hostOk(req)) return res.status(403).json({ error: 'origin' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  try {
    const r = await fetch(TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://turnomaster.app', 'X-Client-Ip': ip },
      body: JSON.stringify(b),
      signal: AbortSignal.timeout(12000),
    });
    const j = await r.json().catch(() => ({}));
    return res.status(r.status).json(j);
  } catch (e) {
    console.error('[lead] no se pudo reenviar el registro:', e && e.message);
    return res.status(502).json({ error: 'crm' });
  }
};
