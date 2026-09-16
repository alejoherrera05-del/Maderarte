(() => {
  'use strict';
  const key = 'maderarte-security-notice-2026-09';
  if (document.getElementById('maderarte-security-notice')) return;

  const style = document.createElement('style');
  style.textContent = `
    html.maderarte-notice-open { overflow: hidden; }
    #maderarte-security-notice {
      position:fixed; inset:0; margin:auto; padding:0; border:0;
      width:min(600px, calc(100% - 24px)); max-width:none;
      max-height:calc(100vh - 24px); max-height:calc(100dvh - 24px);
      overflow:auto; overscroll-behavior:contain; background:#f4f5f7;
      color:#242321; border-radius:8px; box-shadow:0 24px 80px #0005;
    }
    #maderarte-security-notice::backdrop { background:rgba(24,21,18,.62); }
    .maderarte-notice-bar {
      position:sticky; top:0; z-index:1; display:flex; align-items:center;
      justify-content:space-between; gap:12px; padding:4px 10px 4px 20px;
      background:#f4f5f7; border-bottom:1px solid #24232116;
      font:400 14px/1.4 var(--sans, sans-serif);
    }
    .maderarte-notice-close {
      flex:none; width:44px; height:44px; display:grid; place-items:center;
      padding:0; border:0; background:transparent; color:#242321;
      border-radius:50%; cursor:pointer;
    }
    .maderarte-notice-close:hover { background:#2423210d; }
    .maderarte-notice-close:focus-visible,
    .maderarte-notice-actions a:focus-visible,
    .maderarte-notice-reopen:focus-visible { outline:2px solid #d94f0d; outline-offset:2px; }
    .maderarte-notice-image { display:block; width:100%; height:auto; }
    .maderarte-notice-actions {
      display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
      gap:12px; padding:16px 24px 20px; border-top:1px solid #24232116;
      font:400 14px/1.5 var(--sans, sans-serif);
    }
    .maderarte-notice-actions a { display:inline-flex; align-items:center; min-height:44px; text-decoration:underline; text-underline-offset:4px; }
    .maderarte-notice-actions a:first-child { color:#242321; }
    .maderarte-notice-transcript { padding:24px; font:400 16px/1.6 var(--sans, sans-serif); }
    .maderarte-notice-transcript h2 { font:400 30px/1.15 Georgia,serif; margin:0 0 20px; }
    .maderarte-notice-transcript p + p { margin-top:16px; }
    .maderarte-notice-reopen { font:inherit; color:inherit; text-decoration:underline; text-underline-offset:4px; padding:12px 0; background:transparent; border:0; cursor:pointer; }
    @media (max-width:420px) { .maderarte-notice-actions { padding:12px 18px; gap:0 16px; } }
  `;
  document.head.append(style);

  const dialog = document.createElement('dialog');
  dialog.id = 'maderarte-security-notice';
  dialog.setAttribute('aria-label', 'Comunicado oficial de Maderarte: aviso de suplantación');
  dialog.innerHTML = `
    <div class="maderarte-notice-bar">
      <span>Información importante</span>
      <button type="button" class="maderarte-notice-close" aria-label="Cerrar aviso" autofocus>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
    <img class="maderarte-notice-image" width="1122" height="1402" alt="Comunicado oficial de Maderarte Popayán. Aviso de suplantación: terceros usan nuestro nombre y dirección sin autorización para estafar. Distribuidora MadeArte S.A.S, teléfono +57 321 7613587, no tiene vínculo con Maderarte. No realices pagos a ese contacto. Antes de pagar, verifica con nuestro WhatsApp oficial +57 311 747 6465. maderartepopayan.com.">
    <div class="maderarte-notice-transcript" hidden>
      <h2>Aviso de suplantación</h2>
      <p>Terceros están utilizando nuestro nombre y nuestra dirección sin autorización para estafar.</p>
      <p>El perfil Distribuidora MadeArte S.A.S, con el número +57 321 7613587, no tiene vínculo con Maderarte. No realices pagos a este contacto.</p>
      <p>Antes de pagar, verifica con nosotros: WhatsApp oficial +57 311 747 6465.</p>
    </div>
    <div class="maderarte-notice-actions">
      <a href="https://wa.me/573117476465?text=Hola%2C%20quiero%20verificar%20una%20cotizaci%C3%B3n%20con%20Maderarte." target="_blank" rel="noopener">Verificar por WhatsApp</a>
      <a href="/images/comunicado-suplantacion-2026-09.webp" target="_blank" rel="noopener">Ampliar comunicado</a>
    </div>
  `;
  document.body.append(dialog);
  const closeButton = dialog.querySelector('button');
  const noticeImage = dialog.querySelector('img');
  let returnFocus = null;
  noticeImage.addEventListener('error', () => {
    noticeImage.hidden = true;
    noticeImage.style.display = 'none';
    dialog.querySelector('.maderarte-notice-transcript').hidden = false;
  });

  function openNotice() {
    if (dialog.open || typeof dialog.showModal !== 'function') return;
    returnFocus = document.activeElement;
    if (!noticeImage.hasAttribute('src')) noticeImage.src = '/images/comunicado-suplantacion-2026-09.webp';
    dialog.showModal();
    dialog.scrollTop = 0;
    document.documentElement.classList.add('maderarte-notice-open');
    closeButton.focus({ preventScroll:true });
  }
  function dismiss() {
    dialog.close();
    document.documentElement.classList.remove('maderarte-notice-open');
    try { sessionStorage.setItem(key, 'dismissed'); } catch { /* Storage may be disabled. */ }
    if (returnFocus instanceof HTMLElement && returnFocus !== document.body) returnFocus.focus({ preventScroll:true });
  }
  closeButton.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  // Escape must close only this notice, not an underlying product or image viewer.
  window.addEventListener('keydown', event => {
    if (dialog.open && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss();
    }
  }, true);
  const reopen = document.createElement('button');
  reopen.type = 'button';
  reopen.className = 'maderarte-notice-reopen';
  reopen.textContent = 'Aviso de suplantación';
  reopen.addEventListener('click', openNotice);
  (document.querySelector('.footer-inner') || document.body).append(reopen);
  let dismissed = false;
  try { dismissed = sessionStorage.getItem(key) === 'dismissed'; } catch { /* Show the notice without storage. */ }
  if (!dismissed) openNotice();
})();
