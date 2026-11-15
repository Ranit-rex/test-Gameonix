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
  const deviceId = () => {
    const key = 'playovia_device_id';
    try {
      let id = localStorage.getItem(key) || '';
      if (!/^DEV-[A-F0-9]{12}$/.test(id)) {
        const bytes = new Uint8Array(6);
        crypto.getRandomValues(bytes);
        id = 'DEV-' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        localStorage.setItem(key, id);
      }
      return id;
    } catch (_) { return 'DEV-' + Math.random().toString(36).slice(2, 14).toUpperCase(); }
  };
  const deviceDetails = async () => {
    const ua = navigator.userAgent || '';
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
    const mobile = navigator.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(ua);
    let model = '';
    try {
      const hints = await navigator.userAgentData?.getHighEntropyValues?.(['model']);
      model = String(hints?.model || '').trim();
    } catch (_) {}
    if (!model && /Android/i.test(ua)) {
      const match = ua.match(/Android[^;)]*;\\s*([^;)]+?)(?:\\s+Build|\\))/i);
      if (match) model = match[1].replace(/\\s+/g, ' ').trim();
    }
    if (!model && /iPhone/i.test(ua)) model = 'iPhone (exact model not exposed by iOS)';
    if (!model && /iPad/i.test(ua)) model = 'iPad (exact model not exposed by iOS)';
    if (!model) model = String(platform);
    return {
      device: (mobile ? 'Mobile · ' : 'Desktop · ') + String(platform).slice(0, 45),
      deviceModel: String(model).slice(0, 80) || 'Model unavailable',
      deviceId: deviceId()
    };
  };
  const identity = async () => {
    try {
      const appIdentity = window.playoviaGetIdentity?.() || {};
      const auth = window.PlayHubFirebase?.auth || window.firebase?.auth?.();
      const current = auth?.currentUser || null;
      const loggedIn = !!current;
      let playerId = String(appIdentity.playerId || window.PlayHubPlayerId || '').trim().toUpperCase();
      const firestore = window.PlayHubFirebase?.firestore;
      if (loggedIn && !/^[A-Z]{5}[0-9]{4}$/.test(playerId) && typeof window.ensurePlayHubPlayerId === 'function') {
        try { playerId = String(await window.ensurePlayHubPlayerId() || '').trim().toUpperCase(); }
        catch (error) { console.error('[Playovia game analytics] Could not create/retrieve Player ID:', error); }
      }
      if (loggedIn && !/^[A-Z]{5}[0-9]{4}$/.test(playerId) && firestore) {
        for (let attempt = 0; attempt < 30 && !/^[A-Z]{5}[0-9]{4}$/.test(playerId); attempt++) {
          try {
            const profile = await firestore.collection('users').doc(current.uid).get();
            playerId = String(profile.data()?.playerId || '').trim().toUpperCase();
          } catch (error) {
            console.warn('[Playovia game analytics] Could not read Player ID:', error);
            break;
          }
          if (!/^[A-Z]{5}[0-9]{4}$/.test(playerId)) { playerId = String(window.PlayHubPlayerId || '').trim().toUpperCase(); if (!/^[A-Z]{5}[0-9]{4}$/.test(playerId)) await new Promise(resolve => setTimeout(resolve, 500)); }
        }
      }
      if (!/^[A-Z]{5}[0-9]{4}$/.test(playerId)) playerId = '';
      return {
        user: String(appIdentity.username || current?.displayName || current?.email?.split('@')[0] || (loggedIn ? 'Playovia member' : 'Guest')).slice(0, 80),
        playerId,
        loggedIn
      };
    } catch (_) {}
    return { user: 'Guest', playerId: '', loggedIn: false };
  };
  const sendGameEvent = async (type, game) => {
    if (!game || !game.slug) return;
    // Wait for Firebase auth and Firestore profile readiness so the permanent 9-character Playovia Player ID is available.
    try {
      const ready = window.PlayHubFirebase?.ready;
      if (ready && typeof ready.then === 'function') await Promise.race([ready, new Promise(resolve => setTimeout(resolve, 5000))]);
      const firestoreReady = window.PlayHubFirebase?.firestoreReady;
      if (firestoreReady && typeof firestoreReady.then === 'function') await Promise.race([firestoreReady, new Promise(resolve => setTimeout(resolve, 5000))]);
    } catch (_) {}
    const who = await identity();
    const device = await deviceDetails();
    if (who.loggedIn && !who.playerId) console.warn('[Playovia game analytics] Signed-in user has no valid 9-character Playovia Player ID yet.');
    fetch(API + '/api/analytics/game-event', {
      method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, sessionId, slug: game.slug, title: game.title || game.slug, user: who.user, playerId: who.playerId, loggedIn: who.loggedIn, ...device })
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