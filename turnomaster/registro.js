/* Chat guiado de registro de TurnoMaster.
   Hace pocas preguntas, valida y manda el registro a /api/lead (que lo guarda en el CRM).
   Se abre desde cualquier elemento con data-reg. */
(function () {
  'use strict';
  var WA = '5491133346776';
  var RUBROS = ['Odontología', 'Kinesiología', 'Psicología', 'Nutrición', 'Estética', 'Medicina general', 'Otro'];
  var VOLUMEN = ['Menos de 10', '10 a 30', '30 a 60', 'Más de 60'];
  var BAD_DOMAINS = /(^|\.)(example\.(com|org|net)|test\.com|prueba\.com|mailinator\.com|yopmail\.com|guerrillamail\.com|10minutemail\.com|tempmail\.[a-z]+|temp-mail\.org|sharklasers\.com|trashmail\.com|dispostable\.com|getnada\.com|maildrop\.cc|fakeinbox\.com|throwawaymail\.com)$/i;

  var css = '' +
    '#rg-ov{position:fixed;inset:0;z-index:100;background:rgba(14,22,18,.55);display:none;align-items:flex-end;justify-content:center}' +
    '#rg-ov.on{display:flex}' +
    '#rg{background:#fff;width:100%;max-width:440px;height:min(640px,92dvh);border-radius:22px 22px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 80px -20px rgba(8,27,82,.4);font-family:Urbanist,-apple-system,"Segoe UI",sans-serif}' +
    '@media(min-width:560px){#rg-ov{align-items:center}#rg{border-radius:22px;height:min(620px,90dvh)}}' +
    '#rg header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e1e9e4}' +
    '#rg header b{width:34px;height:34px;border-radius:11px;background:#0d5bff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}' +
    '#rg header div{flex:1;line-height:1.2}#rg header strong{display:block;font-size:16px;color:#141a17}#rg header span{font-size:13px;color:#5f6a65}' +
    '#rg header button{border:0;background:#eef4f0;width:34px;height:34px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;color:#141a17}' +
    '#rg-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f6f9f7}' +
    '.rg-m{max-width:82%;padding:10px 14px;border-radius:16px;font-size:16px;line-height:1.4;word-wrap:break-word}' +
    '.rg-b{align-self:flex-start;background:#fff;border:1px solid #d8e2dc;color:#141a17;border-bottom-left-radius:4px}' +
    '.rg-u{align-self:flex-end;background:#0d5bff;color:#fff;border-bottom-right-radius:4px}' +
    '.rg-e{align-self:flex-start;background:#fdf0f0;border:1px solid #f5cccc;color:#b73535;border-radius:16px;padding:10px 14px;font-size:15px}' +
    '#rg-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 12px;background:#f6f9f7}' +
    '#rg-chips button{border:1.5px solid #0d5bff;background:#fff;color:#0038d8;font:700 15px Urbanist,sans-serif;padding:9px 15px;border-radius:99px;cursor:pointer}' +
    '#rg-chips button:hover{background:#ebf1ff}' +
    '#rg form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #e1e9e4;background:#fff}' +
    '#rg input[type=text],#rg input[type=email],#rg input[type=tel]{flex:1;min-width:0;border:1.5px solid #cfdad3;border-radius:12px;padding:12px 14px;font:500 16px Urbanist,sans-serif;color:#141a17;outline:none}' +
    '#rg input:focus{border-color:#0d5bff}' +
    '#rg form button{border:0;background:#0d5bff;color:#fff;font:700 16px Urbanist,sans-serif;padding:0 18px;border-radius:12px;cursor:pointer}' +
    '#rg form button:disabled,#rg input:disabled{opacity:.5;cursor:default}' +
    '#rg .rg-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}' +
    '#rg-note{font-size:12.5px;color:#5f6a65;padding:0 16px 12px;background:#fff}#rg-note a{color:#0038d8}';

  var st = null; // estado de la conversación
  var els = {};

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text) n.textContent = text;
    return n;
  }

  function build() {
    if (els.ov) return;
    var s = el('style'); s.textContent = css; document.head.appendChild(s);
    var ov = el('div', { id: 'rg-ov', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Registro en TurnoMaster' });
    var box = el('div', { id: 'rg' });
    var head = el('header');
    head.appendChild(el('b', { 'aria-hidden': 'true' }, 'T'));
    var tt = el('div'); tt.appendChild(el('strong', null, 'TurnoMaster')); tt.appendChild(el('span', null, 'Unas preguntas rápidas'));
    head.appendChild(tt);
    var close = el('button', { type: 'button', 'aria-label': 'Cerrar' }, '×');
    head.appendChild(close);
    var log = el('div', { id: 'rg-log', 'aria-live': 'polite' });
    var chips = el('div', { id: 'rg-chips' });
    var form = el('form', { novalidate: '' });
    var input = el('input', { type: 'text', autocomplete: 'off', 'aria-label': 'Tu respuesta' });
    var hp = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', 'class': 'rg-hp' });
    var send = el('button', { type: 'submit' }, 'Enviar');
    form.appendChild(input); form.appendChild(hp); form.appendChild(send);
    var note = el('div', { id: 'rg-note' });
    note.appendChild(document.createTextNode('Usamos tus datos solo para contactarte. '));
    var pl = el('a', { href: '/privacidad', target: '_blank', rel: 'noopener' }, 'Privacidad');
    note.appendChild(pl);
    box.appendChild(head); box.appendChild(log); box.appendChild(chips); box.appendChild(form); box.appendChild(note);
    ov.appendChild(box);
    document.body.appendChild(ov);
    els = { ov: ov, log: log, chips: chips, form: form, input: input, hp: hp, send: send };
    close.addEventListener('click', closeChat);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeChat(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); onText(els.input.value); });
  }

  function say(text, cls) {
    var m = el('div', { 'class': cls || 'rg-m rg-b' }, text);
    els.log.appendChild(m);
    els.log.scrollTop = els.log.scrollHeight;
  }
  function bot(text) { say(text, 'rg-m rg-b'); }
  function me(text) { say(text, 'rg-m rg-u'); }
  function err(text) { say(text, 'rg-e'); }

  function setChips(list) {
    els.chips.textContent = '';
    (list || []).forEach(function (c) {
      var b = el('button', { type: 'button' }, c);
      b.addEventListener('click', function () { onChip(c); });
      els.chips.appendChild(b);
    });
    els.chips.style.display = list && list.length ? 'flex' : 'none';
  }

  function setInput(type, placeholder, value, mode) {
    els.input.type = type;
    els.input.placeholder = placeholder || '';
    els.input.value = value || '';
    els.input.setAttribute('inputmode', mode || 'text');
    els.input.disabled = false; els.send.disabled = false;
    els.form.style.display = 'flex';
    setTimeout(function () { els.input.focus(); }, 50);
  }
  function hideInput() { els.form.style.display = 'none'; }

  var STEPS = ['nombre', 'apellido', 'rubro', 'volumen', 'telefono', 'email'];

  function ask(step) {
    st.step = step;
    if (step === 'nombre') { bot('Hola, soy el asistente de TurnoMaster. Te hago unas preguntas rápidas y después te contacta Lean, personalmente. ¿Cómo te llamás?'); setChips([]); setInput('text', 'Tu nombre', '', 'text'); }
    if (step === 'apellido') { bot('Un gusto, ' + st.d.nombre + '. ¿Y tu apellido?'); setChips([]); setInput('text', 'Tu apellido', '', 'text'); }
    if (step === 'rubro') { bot('¿Qué tipo de consultorio tenés?'); setChips(RUBROS); hideInput(); }
    if (step === 'rubro_otro') { bot('Contanos cuál es.'); setChips([]); setInput('text', 'Tu especialidad', '', 'text'); }
    if (step === 'volumen') { bot('Más o menos, ¿cuántas consultas por WhatsApp recibís por día?'); setChips(VOLUMEN); hideInput(); }
    if (step === 'telefono') {
      bot('¿Cuál es tu WhatsApp? Escribilo con código de área, sin 0 y sin 15. Por ejemplo: 11 3334 6776.');
      setChips([]); setInput('tel', '+54 9 11 3334 6776', '+54 9 ', 'tel');
    }
    if (step === 'email') { bot('¿Y tu correo electrónico? Tiene que ser uno real: Gmail, Outlook o el del consultorio.'); setChips([]); setInput('email', 'tucorreo@gmail.com', '', 'email'); }
  }

  function next() {
    var i = STEPS.indexOf(st.step === 'rubro_otro' ? 'rubro' : st.step);
    if (i + 1 < STEPS.length) ask(STEPS[i + 1]); else submit();
  }

  function onChip(c) {
    me(c);
    if (st.step === 'rubro') {
      if (c === 'Otro') return ask('rubro_otro');
      st.d.rubro = c; return next();
    }
    if (st.step === 'volumen') { st.d.consultas_por_dia = c; return next(); }
  }

  function normPhone(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('549') === 0 && d.length === 13) return d;
    if (d.indexOf('54') === 0 && d.length === 12) return '549' + d.slice(2);
    if (d.charAt(0) === '0' && d.length === 11) d = d.slice(1);
    if (d.length === 10) return '549' + d;
    return null;
  }

  function emailError(v) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 120) return 'Ese correo no parece válido. Revisá que esté bien escrito.';
    var dom = v.split('@')[1].toLowerCase();
    if (BAD_DOMAINS.test(dom) || /^(test|prueba|demo|asdf|xxx|nada|ninguno)@/i.test(v)) return 'Necesito un correo real, no uno de prueba.';
    return null;
  }

  function onText(raw) {
    var v = String(raw || '').trim();
    if (!st || st.busy) return;
    if (st.step === 'nombre' || st.step === 'apellido') {
      if (v.length < 2 || v.length > 60 || /[0-9@<>]/.test(v)) { me(v || '…'); err('Escribilo solo con letras, por favor.'); return; }
      me(v); st.d[st.step] = v; return next();
    }
    if (st.step === 'rubro_otro') {
      if (v.length < 3 || v.length > 80) { err('Contanos en pocas palabras cuál es tu especialidad.'); return; }
      me(v); st.d.rubro = v; st.step = 'rubro'; return next();
    }
    if (st.step === 'telefono') {
      var p = normPhone(v);
      me(v);
      if (!p) { err('Faltan o sobran números. Código de área + número, 10 dígitos en total (sin 0 ni 15). Ejemplo: 11 3334 6776.'); return; }
      st.d.telefono = p; return next();
    }
    if (st.step === 'email') {
      me(v);
      var e = emailError(v);
      if (e) { err(e); return; }
      st.d.email = v.toLowerCase(); return next();
    }
  }

  function submit() {
    st.busy = true; hideInput(); setChips([]);
    bot('Listo, un segundo mientras te registro…');
    var body = {
      nombre: st.d.nombre, apellido: st.d.apellido, rubro: st.d.rubro, consultas_por_dia: st.d.consultas_por_dia,
      telefono: st.d.telefono, email: st.d.email, website: els.hp.value, t: Date.now() - st.t0, pagina: location.pathname
    };
    fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok) {
          try { sessionStorage.setItem('tm_reg', JSON.stringify({ n: st.d.nombre, p: st.d.telefono })); } catch (e) {}
          location.href = '/gracias';
          return;
        }
        st.busy = false;
        var j = res.j || {};
        if (j.field === 'email') { err(j.message || 'Ese correo no parece válido.'); ask('email'); return; }
        if (j.field === 'telefono') { err(j.message || 'Revisá el número.'); ask('telefono'); return; }
        fail();
      })
      .catch(function () { st.busy = false; fail(); });
  }

  function fail() {
    err('No pudimos guardar tu registro. Probá de nuevo en un momento o escribinos directo por WhatsApp.');
    setChips(['Reintentar']);
    els.chips.firstChild.addEventListener('click', function () { setChips([]); submit(); });
    var a = el('a', { href: 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Hola, quiero ver TurnoMaster para mi consultorio.'), target: '_blank', rel: 'noopener' }, 'Escribir por WhatsApp');
    a.style.cssText = 'align-self:flex-start;color:#0038d8;font-weight:700;margin:0 0 0 4px';
    els.log.appendChild(a);
  }

  var lastFocus = null;
  function openChat(e) {
    if (e) e.preventDefault();
    build();
    lastFocus = document.activeElement;
    els.log.textContent = '';
    st = { step: 'nombre', d: {}, busy: false, t0: Date.now() };
    els.hp.value = '';
    els.ov.classList.add('on');
    document.body.style.overflow = 'hidden';
    ask('nombre');
  }
  function closeChat() {
    if (!els.ov) return;
    els.ov.classList.remove('on');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-reg]');
    if (t) openChat(e);
  });
  if (location.hash === '#registro') document.addEventListener('DOMContentLoaded', function () { openChat(); });
})();
