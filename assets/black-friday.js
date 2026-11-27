/* Fixed campaign dates in Colombia time; reloading never restarts the offer. */
(function () {
  'use strict';

  const STARTS_AT = Date.parse('2026-11-27T00:00:00-05:00');
  const ENDS_AT = Date.parse('2026-12-01T00:00:00-05:00');

  function getCountdownState(now) {
    const phase = now < STARTS_AT ? 'upcoming' : now < ENDS_AT ? 'active' : 'ended';
    const target = phase === 'upcoming' ? STARTS_AT : ENDS_AT;
    const totalSeconds = Math.max(0, Math.ceil((target - now) / 1000));
    return {
      phase,
      totalSeconds,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor(totalSeconds / 3600) % 24,
      minutes: Math.floor(totalSeconds / 60) % 60,
      seconds: totalSeconds % 60
    };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = Object.freeze({ STARTS_AT, ENDS_AT, getCountdownState });
    return;
  }
  if (typeof document === 'undefined' || !document.body?.classList.contains('black-friday-mode')) return;

  const campaign = document.querySelector('[data-black-friday]');
  if (!campaign) return;
  const label = campaign.querySelector('[data-bf-label]');
  const clock = campaign.querySelector('[data-bf-clock]');
  const fallback = campaign.querySelector('[data-bf-fallback]');
  const message = campaign.querySelector('[data-bf-message]');
  const cta = campaign.querySelector('[data-bf-cta]');
  const kicker = campaign.querySelector('[data-bf-kicker]');
  const units = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map(unit => [
    unit, campaign.querySelector(`[data-bf-${unit}]`)
  ]));
  if (!label || !clock || !fallback || !message || !cta || Object.values(units).some(unit => !unit)) return;

  const originalMessage = message.innerHTML;
  const originalKicker = kicker?.textContent;
  const originalFallback = fallback.textContent;
  let renderedPhase = null;
  let interval = null;
  clock.setAttribute('aria-live', 'off');

  function update() {
    const state = getCountdownState(Date.now());
    if (state.phase !== renderedPhase) {
      renderedPhase = state.phase;
      campaign.dataset.bfState = state.phase;
      const ended = state.phase === 'ended';
      clock.hidden = ended;
      fallback.hidden = !ended;
      label.textContent = ended
        ? 'Estas ofertas han finalizado'
        : state.phase === 'upcoming' ? 'Las ofertas comienzan en' : 'Estas ofertas terminan en';
      cta.textContent = state.phase === 'active' ? 'Aprovechar las ofertas' : 'Explorar catálogo';
      if (cta.hasAttribute('aria-label')) cta.setAttribute('aria-label', cta.textContent);
      if (ended) {
        message.textContent = 'Encuentra los muebles para tu hogar.';
        fallback.textContent = 'Gracias por acompañarnos. Descubre más en nuestro catálogo.';
        if (kicker) kicker.textContent = 'Black Friday 2026';
      } else {
        message.innerHTML = originalMessage;
        fallback.textContent = originalFallback;
        if (kicker) kicker.textContent = originalKicker;
      }
    }
    for (const [unit, element] of Object.entries(units)) {
      element.textContent = String(state[unit]).padStart(2, '0');
    }
    if (document.hidden || state.phase === 'ended') {
      if (interval !== null) clearInterval(interval);
      interval = null;
    } else if (interval === null) {
      interval = setInterval(update, 1000);
    }
  }

  // A suspended tab or a page restored from cache must use the current time.
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  update();
})();
