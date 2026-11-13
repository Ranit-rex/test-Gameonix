(() => {
  const API = 'https://test-gameonix.onrender.com';
  let sessionId = '';
  try {
    sessionId = sessionStorage.getItem('playovia_analytics_session') || '';
    if (!sessionId) {
      sessionId = 'pv-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
      sessionStorage.setItem('playovia_analytics_session', sessionId);
    }
  } catch (_) { sessionId = 'pv-' + Date.now() + '-' + Math.random().toString(36).slice(2); }

  const track = () => {
    const page = location.pathname || '/';
    if (page.startsWith('/games/')) return;
    fetch(API + '/api/analytics/visit', {
      method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, page })
    }).catch(() => {});
  };

  let notice;
  const checkMaintenance = async () => {
    try {
      const response = await fetch(API + '/api/site/status', { mode: 'cors', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.maintenanceMode) {
        if (!notice) {
          notice = document.createElement('div');
          notice.id = 'playovia-maintenance-notice';
          notice.textContent = '🛠️ Playovia is currently in maintenance mode. Some features may be temporarily unavailable.';
          Object.assign(notice.style, { position: 'fixed', left: '12px', right: '12px', bottom: '12px', zIndex: '2147483647', padding: '12px 16px', borderRadius: '12px', background: '#171923', color: '#fff', border: '1px solid #64748b', boxShadow: '0 8px 30px #0006', font: '14px system-ui', textAlign: 'center' });
          document.body.appendChild(notice);
        }
      } else if (notice) { notice.remove(); notice = null; }
    } catch (_) {}
  };

  track();
  checkMaintenance();
  setInterval(checkMaintenance, 60000);
  window.addEventListener('popstate', () => { track(); checkMaintenance(); });
  const originalPush = history.pushState;
  history.pushState = function(...args) { const result = originalPush.apply(this, args); track(); checkMaintenance(); return result; };
})();