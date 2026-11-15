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

  const activeGames = new Map();
  const deviceName = () => {
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
    const mobile = navigator.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    return (mobile ? 'Mobile · ' : 'Desktop · ') + String(platform).slice(0, 70);
  };
  const identity = () => {
    let user = 'Guest', loggedIn = false;
    try {
      const current = window.firebase?.auth?.()?.currentUser || window.auth?.currentUser || null;
      if (current) { user = current.displayName || current.email || 'Logged-in player'; loggedIn = true; }
    } catch (_) {}
    return { user: String(user).slice(0, 80), loggedIn };
  };
  const sendGameEvent = (type, game) => {
    if (!game || !game.slug) return;
    const who = identity();
    fetch(API + '/api/analytics/game-event', {
      method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, sessionId, slug: game.slug, title: game.title || game.slug, user: who.user, loggedIn: who.loggedIn, device: deviceName() })
    }).then(response => { if (!response.ok) console.warn('[Playovia game analytics] Event rejected:', response.status); }).catch(error => console.warn('[Playovia game analytics] Network error:', error));
  };
  const slugFromElement = el => {
    const link = el.closest('a[href*="/games/"], [data-game-slug], [data-game]');
    if (!link) return null;
    const href = link.getAttribute('href') || '';
    const raw = link.dataset.gameSlug || link.dataset.game || (href.match(/\/games\/([^/?#]+)/) || [])[1] || '';
    const slug = String(raw).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!slug) return null;
    const title = link.dataset.gameTitle || link.getAttribute('aria-label') || link.querySelector('h1,h2,h3,h4,.game-title')?.textContent?.trim() || link.textContent?.trim().replace(/\s+/g, ' ').slice(0, 90) || slug;
    return { slug, title };
  };
  window.playoviaTrackGame = (type, slug, title) => {
    const gameSlug = String(slug || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (!gameSlug) return;
    const game = { slug: gameSlug, title: String(title || gameSlug).slice(0, 90) };
    if (type === 'game_open') activeGames.set(gameSlug, { ...game, startedAt: Date.now() });
    if (type === 'game_exit') activeGames.delete(gameSlug);
    sendGameEvent(type, game);
  };
  setInterval(() => { for (const game of activeGames.values()) sendGameEvent('game_heartbeat', game); }, 30000);
  const finishGame = slug => {
    const game = activeGames.get(slug);
    if (!game) return;
    sendGameEvent('game_exit', game);
    activeGames.delete(slug);
  };
  window.addEventListener('pagehide', () => { for (const slug of activeGames.keys()) finishGame(slug); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !activeGames.size) return;
    const top = [...activeGames.keys()].pop();
    setTimeout(() => {
      const stillOpen = [...document.querySelectorAll('iframe')].some(frame => {
        try { return frame.contentWindow && frame.getClientRects().length; } catch (_) { return false; }
      });
      if (!stillOpen) finishGame(top);
    }, 250);
  });

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