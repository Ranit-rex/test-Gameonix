/* Playovia Universal Multiplayer Engine
   Shared RTDB matchmaking for every game except Ghost Night and Ashgrave. */
(function (global) {
  'use strict';
  const ROOT = 'multiplayer';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const clean = value => String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 32) || 'Player';
  const makeCode = () => Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const rooms = db => db.ref(ROOT + '/rooms');
  const matches = db => db.ref(ROOT + '/matches');
  const room = (db, code) => rooms(db).child(String(code || '').toUpperCase());
  const match = (db, id) => matches(db).child(id);

  async function createRoom({ db, uid, name, gameId, mode, gameTitle, maxPlayers = 4, visibility = 'public' }) {
    if (!db || !uid || !gameId) throw new Error('Multiplayer is not ready. Sign in and retry.');
    const playerName = clean(name);
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = makeCode(), now = Date.now();
      const payload = {
        roomId: code, gameId: String(gameId), mode: String(mode || 'default'),
        gameSlug: String(gameId), gameTitle: String(gameTitle || gameId),
        hostUid: uid, hostName: playerName,
        members: { [uid]: { uid, name: playerName, joinedAt: now, lastSeen: now } },
        status: 'waiting', visibility, maxPlayers: Math.max(2, Math.min(16, Number(maxPlayers) || 4)),
        createdAt: now, updatedAt: now
      };
      const result = await room(db, code).transaction(current => current === null ? payload : undefined);
      if (result.committed) return { roomId: code, ref: room(db, code), data: payload };
    }
    throw new Error('Could not reserve a room code. Please retry.');
  }

  async function joinRoom({ db, uid, name, gameId, code }) {
    if (!db || !uid || !gameId) throw new Error('Multiplayer is not ready. Sign in and retry.');
    const normalized = String(code || '').trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(normalized)) throw new Error('Enter a valid 8-character room code.');
    const ref = room(db, normalized), snap = await ref.once('value');
    if (!snap.exists()) throw new Error('Room not found. Check the code.');
    const data = snap.val();
    if ((data.gameId || data.gameSlug) !== gameId) throw new Error('This room belongs to another game.');
    if (data.status !== 'waiting') throw new Error('This match has already started.');
    const members = data.members || {}, count = Object.keys(members).length;
    if (count >= Number(data.maxPlayers || 4) && !members[uid]) throw new Error('Room is full.');
    if (!members[uid]) {
      const now = Date.now();
      const member = { uid, name: clean(name), joinedAt: now, lastSeen: now };
      const joined = await ref.child('members/' + uid).transaction(current => current || member);
      if (!joined.committed) throw new Error('Could not join this room. Please retry.');
    }
    return { roomId: normalized, ref, data };
  }

  async function listRooms({ db, gameId, maxAgeMs = 1800000 }) {
    if (!db || !gameId) return [];
    const snap = await rooms(db).orderByChild('gameId').equalTo(String(gameId)).once('value'), found = [], now = Date.now();
    snap.forEach(child => {
      const data = child.val() || {}, members = data.members || {};
      const count = Object.keys(members).length;
      const age = now - Number(data.updatedAt || data.createdAt || 0);
      if ((data.gameId || data.gameSlug) === gameId && data.status === 'waiting' &&
          data.visibility !== 'private' && count < Number(data.maxPlayers || 4) &&
          age >= 0 && age < maxAgeMs) found.push(data);
    });
    return found.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  }

  async function startMatch({ db, roomRef, uid, gameId, state }) {
    if (!db || !roomRef || !uid) throw new Error('Join a room before starting.');
    const snap = await roomRef.once('value'), roomData = snap.val();
    if (!roomData) throw new Error('Room no longer exists.');
    if (roomData.hostUid !== uid) throw new Error('Only the room host can start this match.');
    if ((roomData.gameId || roomData.gameSlug) !== gameId) throw new Error('Game ID does not match this room.');
    if (roomData.status !== 'waiting') throw new Error('This room has already started.');
    const ref = matches(db).push(), id = ref.key, now = Date.now();
    await ref.set({ gameId, hostUid: uid, roomCode: roomData.roomId, createdAt: now, state: state || {} });
    try {
      await roomRef.update({ status: 'playing', matchId: id, updatedAt: now });
      return id;
    } catch (error) {
      try { await ref.remove(); } catch (_) {}
      throw error;
    }
  }

  async function leaveRoom({ roomRef, uid, isHost }) {
    if (!roomRef || !uid) return;
    if (isHost) await roomRef.remove();
    else await roomRef.child('members/' + uid).remove();
  }

  function heartbeat(roomRef, uid) {
    if (!roomRef || !uid) return Promise.resolve();
    const now = Date.now();
    return roomRef.update({ ['members/' + uid + '/lastSeen']: now, updatedAt: now });
  }

  global.PlayoviaMultiplayer = Object.freeze({
    rooms, matches, room, match, createRoom, joinRoom, listRooms, startMatch, leaveRoom, heartbeat
  });
})(window);
