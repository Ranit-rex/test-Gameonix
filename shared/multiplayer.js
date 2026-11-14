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
  // Cleanup is server-managed. The browser must never scan/delete the full RTDB tree.
  async function cleanupOldRooms() {
    return { rooms: 0, matches: 0, serverManaged: true };
  }
  function startHourlyCleanup() {}
  
  async function createRoom({ db, uid, name, gameId, mode, gameTitle, maxPlayers = 4, visibility = 'public' }) {
    if (!db || !uid || !gameId) throw new Error('Multiplayer is not ready. Sign in and retry.');
    startHourlyCleanup(db);
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
      if (result.committed) { showInviteButton({uid,name:playerName,gameId:String(gameId),gameTitle:String(gameTitle||gameId),roomId:code,gameUrl:location.pathname}); return { roomId: code, ref: room(db, code), data: payload }; }
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
    showInviteButton({uid,name:clean(name),gameId:String(gameId),gameTitle:String(data.gameTitle||gameId),roomId:normalized,gameUrl:location.pathname});
    return { roomId: normalized, ref, data };
  }

  async function listRooms({ db, gameId, maxAgeMs = 600000 }) {
    if (!db || !gameId) return [];
    const snap = await rooms(db).orderByChild('gameId').equalTo(String(gameId)).once('value'), found = [], now = Date.now();\n    maxAgeMs = Math.min(Number(maxAgeMs) || 600000, 600000);
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
    startHourlyCleanup(db);
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
    return Promise.all([
      roomRef.child('members/' + uid + '/lastSeen').set(now),
      roomRef.child('updatedAt').set(now)
    ]);
  }


// Room invite controls for every game using the shared multiplayer engine.
let inviteContext=null;
function inviteBridge(){try{return global.parent&&global.parent!==global?global.parent.PlayHubFirebase:null}catch(_){return null}}
async function inviteStore(){const b=inviteBridge();if(!b)throw Error('Open this game inside Playovia to invite friends.');if(b.ready)await b.ready;if(b.firestoreReady)await b.firestoreReady;if(!b.firestore)throw Error('Playovia chat is still connecting.');return {fs:b.firestore,bridge:b}}
let inviteLobbyObserver=null;
function findVisibleInviteLobby(){
 const nodes=[...document.querySelectorAll('#lobby,[id*="lobby" i],[class*="lobby" i],#roomLobby,[id*="party" i],[class*="party" i]')];
 const visible=nodes.filter(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden'});
 visible.sort((a,b)=>{const score=el=>(/lobby/i.test(el.id+' '+el.className)?0:100)+(el.querySelector('#roomCode,#roomcode,[id*="roomcode" i]')?0:20)+el.getBoundingClientRect().width*el.getBoundingClientRect().height/100000;return score(a)-score(b)});
 return visible[0]||null;
}
function placeInviteButton(){
 const b=document.getElementById('playoviaInviteFriends');if(!b||!inviteContext)return;
 const lobby=findVisibleInviteLobby();
 if(lobby&&!lobby.contains(b)){b.style.cssText='display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin:14px 0 4px;padding:12px 16px;border:1px solid #8b7cff;border-radius:12px;background:linear-gradient(120deg,#754cff,#2478e8);color:white;font:700 14px system-ui;box-shadow:0 8px 24px #0005;position:relative;z-index:20';lobby.appendChild(b)}
}
function showInviteButton(c){
 inviteContext=c;let b=document.getElementById('playoviaInviteFriends');
 if(!b){b=document.createElement('button');b.id='playoviaInviteFriends';b.type='button';b.textContent='✉ Invite Friends';b.onclick=openInvitePicker;b.style.cssText='position:fixed;right:14px;bottom:100px;z-index:2147483000;padding:12px 16px;border:1px solid #8b7cff;border-radius:12px;background:linear-gradient(120deg,#754cff,#2478e8);color:white;font:700 13px system-ui;box-shadow:0 8px 30px #0008';document.body.appendChild(b)}
 placeInviteButton();
 if(!inviteLobbyObserver){inviteLobbyObserver=new MutationObserver(()=>placeInviteButton());inviteLobbyObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']})}
}
async function openInvitePicker(){if(!inviteContext)return;let m=document.getElementById('playoviaInviteModal');if(!m){m=document.createElement('div');m.id='playoviaInviteModal';m.style.cssText='position:fixed;inset:0;z-index:2147483001;background:#050816dd;display:grid;place-items:center;padding:16px;font:14px system-ui;color:white';m.innerHTML='<div style="width:min(420px,100%);max-height:80vh;overflow:auto;background:#171a32;border:1px solid #6555a8;border-radius:18px;padding:18px"><b style="font-size:18px">Invite friends</b><button id="pivClose" style="float:right;background:none;border:0;color:white;font-size:24px">×</button><p id="pivInfo" style="color:#bac4e1"></p><div id="pivList">Loading friends…</div><p id="pivStatus" style="color:#b9c7ee"></p><button id="pivSend" style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;background:#7655ff;color:white;font-weight:700">Send invitations</button></div>';document.body.appendChild(m);m.querySelector('#pivClose').onclick=()=>m.remove();m.querySelector('#pivSend').onclick=sendRoomInvites}m.querySelector('#pivInfo').textContent=inviteContext.gameTitle+' · Room '+inviteContext.roomId;const list=m.querySelector('#pivList');list.textContent='Loading friends…';try{const {fs}=await inviteStore(),snap=await fs.collection('friendships').doc(inviteContext.uid).collection('friends').get();if(snap.empty){list.textContent='Add friends before sending invitations.';return}const profiles=await Promise.all(snap.docs.map(d=>fs.collection('users').doc(d.id).get()));list.innerHTML=profiles.map((p,i)=>p.exists?'<label style="display:flex;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #ffffff18"><input type="checkbox" value="'+snap.docs[i].id+'"><span>@'+String(p.data().username||'player').replace(/[&<>"]/g,'')+'</span></label>':'').join('')||'No friends found.'}catch(e){list.textContent=e.message}}
async function sendRoomInvites(){const m=document.getElementById('playoviaInviteModal');if(!m||!inviteContext)return;const ids=[...m.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value),status=m.querySelector('#pivStatus'),send=m.querySelector('#pivSend');if(!ids.length){status.textContent='Select at least one friend.';return}send.disabled=true;status.textContent='Sending…';try{const {fs,bridge}=await inviteStore(),c=inviteContext,stamp=()=>bridge.serverTimestamp();for(const uid of ids){const pair=[c.uid,uid].sort(),conv=fs.collection('conversations').doc(pair.join('_'));await conv.set({participants:pair,createdAt:stamp(),updatedAt:stamp()},{merge:true});await conv.collection('messages').add({fromUid:c.uid,username:c.name,text:'🎮 Invited you to '+c.gameTitle+' · Room '+c.roomId,type:'game_invite',gameId:c.gameId,gameTitle:c.gameTitle,roomCode:c.roomId,gameUrl:c.gameUrl,createdAt:stamp(),expiresAt:new Date(Date.now()+12*60*60*1000)});await fs.collection('notifications').doc(uid).collection('items').add({toUid:uid,fromUid:c.uid,type:'game_invite',title:'Game invitation',body:c.name+' invited you to '+c.gameTitle,gameId:c.gameId,gameTitle:c.gameTitle,roomCode:c.roomId,gameUrl:c.gameUrl,status:'unread',createdAt:stamp(),expiresAt:new Date(Date.now()+12*60*60*1000)})}status.textContent='Invitation sent to '+ids.length+' friend(s).'}catch(e){status.textContent='Invite failed: '+e.message}finally{send.disabled=false}}
function showInviteCode(){const code=new URLSearchParams(location.search).get('invite');if(!code)return;const b=document.createElement('div');b.textContent='Friend invite · Room '+code+' — tap Join in the room menu.';b.style.cssText='position:fixed;top:10px;left:10px;right:10px;z-index:2147483000;padding:12px;border-radius:10px;background:#30245e;color:white;text-align:center;font:700 13px system-ui';document.body.appendChild(b);const fill=()=>{const input=[...document.querySelectorAll('input')].find(x=>x.maxLength===8||/room code|code/i.test(x.placeholder||''));if(input){input.value=code;input.dispatchEvent(new Event('input',{bubbles:true}))}};fill();new MutationObserver(fill).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showInviteCode,{once:true});else showInviteCode();

  global.PlayoviaMultiplayer = Object.freeze({
    rooms, matches, room, match, createRoom, joinRoom, listRooms, startMatch, leaveRoom, heartbeat, cleanupOldRooms, showInviteButton
  });
})(window);
