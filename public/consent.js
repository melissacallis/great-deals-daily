// Cookie consent. Nothing that tracks visitors (the Pinterest tag, its cookies, or remembering which app
// a visitor came from) runs until the visitor clicks "Accept". "Decline" keeps it all off.
// The choice itself is kept in localStorage ("consent" = "granted" | "denied"); that is strictly necessary.
// Reopen the banner from any element with [data-cookie-settings] (e.g. the footer link).
const KEY = 'consent';
const PINTEREST_TAG = '2613911035706';

export function hasConsent() {
  try { return localStorage.getItem(KEY) === 'granted'; } catch { return false; }
}

let pinterestLoaded = false;
function loadPinterest() {
  if (pinterestLoaded) return;
  pinterestLoaded = true;
  /* Pinterest base code, loaded only after consent */
  !function (e) {
    if (!window.pintrk) {
      window.pintrk = function () { window.pintrk.queue.push(Array.prototype.slice.call(arguments)); };
      const n = window.pintrk; n.queue = []; n.version = '3.0';
      const t = document.createElement('script'); t.async = true; t.src = e;
      document.head.appendChild(t);
    }
  }('https://s.pinimg.com/ct/core.js');
  window.pintrk('load', PINTEREST_TAG);
  window.pintrk('page');
  // Count taps on product links as a Pinterest custom event (only with consent).
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (a && (/(^|\.)(amazon\.com|amzn\.to)$/.test(a.hostname) || a.pathname === '/go/p')) window.pintrk('track', 'custom', { event_id: 'amazon-' + Date.now() });
  }, true);
}

function save(value) {
  try { localStorage.setItem(KEY, value); } catch {}
  document.dispatchEvent(new CustomEvent('consentchange', { detail: value }));
  if (value === 'granted') loadPinterest();
  else if (pinterestLoaded) location.reload(); // turning it off after it ran: reload so the tag is gone
}

function banner() {
  if (document.getElementById('cookie-banner')) return;
  const box = document.createElement('div');
  box.id = 'cookie-banner';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-live', 'polite');
  box.setAttribute('aria-label', 'Cookie choice');
  box.innerHTML = `
    <p><strong>Cookies?</strong> With your OK, we use the Pinterest tag (a cookie) to see which pins bring visitors,
    and we note which app you came from when you tap a deal. No emails, no selling your data.
    Decline and nothing like that runs. <a href="/privacy">Privacy</a></p>
    <div class="cookie-actions">
      <button type="button" class="cookie-decline">Decline</button>
      <button type="button" class="cookie-accept">Accept</button>
    </div>`;
  box.querySelector('.cookie-accept').addEventListener('click', () => { save('granted'); box.remove(); });
  box.querySelector('.cookie-decline').addEventListener('click', () => { save('denied'); box.remove(); });
  document.body.appendChild(box);
}

const style = document.createElement('style');
style.textContent = `
  #cookie-banner { position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 1000; max-width: 560px; margin: 0 auto;
    background: #fff; color: #3b0f3a; border-radius: 18px; padding: 14px 16px; box-shadow: 0 12px 34px rgba(59,15,58,.3);
    font: 14px/1.45 Inter, system-ui, sans-serif; border: 2px solid #ffd6e4; }
  #cookie-banner p { margin: 0 0 10px; } #cookie-banner a { color: #ff3d7f; font-weight: 700; }
  #cookie-banner .cookie-actions { display: flex; gap: 10px; justify-content: flex-end; }
  #cookie-banner button { font: 700 14px Inter, system-ui, sans-serif; border-radius: 999px; padding: 10px 18px; cursor: pointer; border: 2px solid #3b0f3a; }
  #cookie-banner .cookie-decline { background: #fff; color: #3b0f3a; }
  #cookie-banner .cookie-accept { background: #ff3d7f; color: #fff; border-color: #ff3d7f; }
  [data-cookie-settings] { cursor: pointer; text-decoration: underline; background: none; border: 0; color: inherit; font: inherit; padding: 0; }`;
document.head.appendChild(style);

function init() {
  let choice = null;
  try { choice = localStorage.getItem(KEY); } catch {}
  // Global Privacy Control (browser opt-out signal) counts as "Decline" unless the visitor chose "Accept" themselves.
  const gpc = navigator.globalPrivacyControl === true;
  if (choice === 'granted') loadPinterest();
  else if (choice !== 'denied' && !gpc) banner();
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-cookie-settings]')) banner(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
