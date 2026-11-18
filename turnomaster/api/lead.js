// Registro del chat guiado de TurnoMaster → CRM de Social Clap.
// La clave del CRM vive en variables de entorno de Vercel (LANDING_INTAKE_KEY, CRM_URL). Nunca en la página.
const dns = require('node:dns').promises;

const ALLOWED_HOSTS = ['turnomaster.app', 'www.turnomaster.app'];
const LIMIT_PER_HOUR = 8;
const MIN_FILL_MS = 6000; // un humano tarda más que esto en contestar todo
const hits = new Map();
const BAD_DOMAINS = /(^|\.)(example\.(com|org|net)|test\.com|prueba\.com|mailinator\.com|yopmail\.com|guerrillamail\.com|10minutemail\.com|tempmail\.[a-z]+|temp-mail\.org|sharklasers\.com|trashmail\.com|dispostable\.com|getnada\.com|maildrop\.cc|fakeinbox\.com|throwawaymail\.com)$/i;

const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function hostOk(req) {
  const src = req.headers.origin || req.headers.referer || '';
  try { return ALLOWED_HOSTS.includes(new URL(src).hostname); } catch (e) { return false; }
}
function rateOk(ip) {
  const now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (h.length >= LIMIT_PER_HOUR) { hits.set(ip, h); return false; }
  h.push(now); hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return true;
}

// ¿El dominio del correo puede recibir mails? Registro MX o, si no hay, registro A.
// Si el DNS tarda demasiado no bloqueamos a la persona: se acepta y se revisa a mano.
async function domainReceivesMail(domain) {
  const withTimeout = (p) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
  const attempt = async (fn) => {
    try { const r = await withTimeout(fn(domain)); return r && r.length ? 'yes' : 'no'; }
    catch (e) { return e && (e.code === 'ENOTFOUND' || e.code === 'ENODATA') ? 'no' : 'slow'; }
  };
  const mx = await attempt(dns.resolveMx);
  if (mx !== 'no') return true;
  return (await attempt(dns.resolve4)) !== 'no';
}

function normPhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('549') && d.length === 13) return d;
  if (d.startsWith('54') && d.length === 12) return '549' + d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (d.length === 10) return '549' + d;
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!hostOk(req)) return res.status(403).json({ error: 'origin' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (!rateOk(ip)) return res.status(429).json({ error: 'rate', message: 'Demasiados intentos. Probá más tarde.' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  // Anti-bots: campo trampa lleno o formulario completado demasiado rápido → respondemos "ok" sin guardar nada.
  if (b.website || !(Number(b.t) >= MIN_FILL_MS)) return res.status(200).json({ ok: true });

  const lead = {
    nombre: clean(b.nombre, 60),
    apellido: clean(b.apellido, 60),
    rubro: clean(b.rubro, 80),
    consultas_por_dia: clean(b.consultas_por_dia, 40),
    telefono: normPhone(b.telefono),
    email: clean(b.email, 120).toLowerCase(),
    pagina: clean(b.pagina, 120) || undefined,
  };
  if (!lead.nombre || !lead.apellido || !lead.rubro || !lead.consultas_por_dia) {
    return res.status(422).json({ error: 'invalid', message: 'Faltan datos.' });
  }
  if (!lead.telefono) return res.status(422).json({ error: 'invalid', field: 'telefono', message: 'Revisá el número de WhatsApp.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) {
    return res.status(422).json({ error: 'invalid', field: 'email', message: 'Ese correo no parece válido.' });
  }
  const domain = lead.email.split('@')[1];
  if (BAD_DOMAINS.test(domain) || /^(test|prueba|demo|asdf|xxx)@/.test(lead.email)) {
    return res.status(422).json({ error: 'invalid', field: 'email', message: 'Necesito un correo real, no uno de prueba.' });
  }
  if (!(await domainReceivesMail(domain))) {
    return res.status(422).json({ error: 'invalid', field: 'email', message: 'Ese correo no existe. Revisá cómo lo escribiste.' });
  }

  const url = process.env.CRM_URL;
  const key = process.env.LANDING_INTAKE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'not_configured' });

  try {
    const r = await fetch(url.replace(/\/$/, '') + '/api/public/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Intake-Key': key },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      console.error('[lead] el CRM respondió', r.status);
      return res.status(502).json({ error: 'crm' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[lead] no se pudo llegar al CRM:', e && e.message);
    return res.status(502).json({ error: 'crm' });
  }
};
