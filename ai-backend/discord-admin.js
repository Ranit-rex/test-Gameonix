const crypto = require('node:crypto');
let app;
function db() {
  const raw = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '');
  if (!raw) throw new Error('Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON in Render.');
  if (!app) {
    let credentials;
    try { credentials = JSON.parse(raw); } catch (_) { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.'); }
    const admin = require('firebase-admin');
    app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(credentials) });
  }
  return require('firebase-admin').firestore();
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 32768) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); } catch (_) { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }); }
}
function audit(database, action, actor, details = {}) {
  return database.collection('adminAuditLog').add({
    action, targetUid: String(details.uid || ''), reason: String(details.reason || ''),
    adminEmail: 'Discord admin ' + String(actor || '').slice(0, 32),
    source: 'discord', createdAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
  });
}
function userData(s) {
  const u = s.data() || {};
  return { uid: s.id, displayName: u.displayName || u.username || 'Player', username: u.username || '',
    email: u.email || '', currencyBalance: Number(u.currencyBalance || 0), banned: u.banned === true, banReason: u.banReason || '' };
}
async function handle(req, res, origin, send) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method !== 'POST' || url.pathname !== '/api/discord/admin') return false;
  const expected = String(process.env.DISCORD_INTEGRATION_TOKEN || '');
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\\s+/i, '');
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    send(res, 401, { error: 'Unauthorized.' }, origin); return true;
  }
  try {
    const input = await body(req), action = String(input.action || ''), actor = String(input.actor || 'discord');
    const database = db(), admin = require('firebase-admin'), stamp = admin.firestore.FieldValue.serverTimestamp();
    if (action === 'player_search') {
      const id = String(input.playerId || '').trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}$/.test(id)) { send(res,400,{error:'Player ID must be 5 letters followed by 4 digits.'},origin); return true; }
      const link = await database.collection('playerIds').doc(id).get();
      if (!link.exists || !link.data().uid) { send(res,404,{error:'No player found with that Player ID.'},origin); return true; }
      const profile = await database.collection('users').doc(String(link.data().uid)).get();
      if (!profile.exists) { send(res,404,{error:'Player profile is missing.'},origin); return true; }
      send(res,200,{ok:true,playerId:id,player:userData(profile)},origin); return true;
    }
    if (action === 'analytics') {
      const [users,reports,games,auditRows,presence,sessions] = await Promise.all([
        database.collection('users').limit(1000).get(), database.collection('reports').where('status','==','open').limit(500).get(),
        database.collection('games').limit(300).get(), database.collection('adminAuditLog').orderBy('createdAt','desc').limit(50).get(),
        database.collection('presence').limit(500).get(), database.collection('gameSessions').orderBy('startedAt','desc').limit(1000).get()
      ]);
      const now=Date.now(), live=presence.docs.filter(d=>{const p=d.data(),t=p.updatedAt?.toMillis?.()||p.playingAt?.toMillis?.()||0;return !!p.playingGame&&now-t<600000;});
      const recent=users.docs.filter(d=>{const t=d.data().createdAt?.toMillis?.();return t&&now-t<604800000;}).length;
      const day=new Date();day.setHours(0,0,0,0);
      const plays=sessions.docs.filter(d=>(d.data().startedAt?.toMillis?.()||0)>=day.getTime()).length;
      send(res,200,{ok:true,players:users.size,playersSampled:users.size>=1000,newPlayers7d:recent,openReports:reports.size,gameOverrides:games.size,adminActions:auditRows.size,playingNow:live.length,activePlayers:live.slice(0,30).map(d=>({uid:d.id,game:d.data().playingGame||'Playing'})),playsToday:plays,sessionSampled:sessions.size>=1000,generatedAt:new Date().toISOString()},origin); return true;
    }
    if (action === 'users') {
      const s=await database.collection('users').orderBy('createdAt','desc').limit(40).get();
      send(res,200,{ok:true,users:s.docs.map(userData)},origin); return true;
    }
    if (action === 'set_ban') {
      const uid=String(input.uid||''), banned=input.banned, reason=String(input.reason||'').slice(0,300);
      if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||typeof banned!=='boolean'){send(res,400,{error:'Valid uid and banned boolean required.'},origin);return true;}
      await database.collection('users').doc(uid).set({banned,banReason:banned?reason:'',bannedAt:banned?stamp:null,updatedAt:stamp},{merge:true});
      await audit(database,banned?'user_banned':'user_unbanned',actor,{uid,reason});
      send(res,200,{ok:true,uid,banned},origin); return true;
    }
    if (action === 'currency') {
      const uid=String(input.uid||''), operation=String(input.operation||''), amount=Number(input.amount), reason=String(input.reason||'').trim().slice(0,300);
      if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||!['add','remove','set'].includes(operation)||!Number.isSafeInteger(amount)||amount<=0||!reason){send(res,400,{error:'Valid uid, operation, positive whole amount and reason required.'},origin);return true;}
      const ref=database.collection('users').doc(uid), log=database.collection('currencyTransactions').doc();let before=0,after=0;
      await database.runTransaction(async tx=>{const s=await tx.get(ref);if(!s.exists)throw new Error('User profile not found.');before=Math.max(0,Number(s.data().currencyBalance||0));after=operation==='add'?before+amount:operation==='remove'?before-amount:amount;if(!Number.isSafeInteger(after)||after<0)throw new Error('Insufficient balance or invalid balance.');tx.set(ref,{currencyBalance:after,updatedAt:stamp},{merge:true});tx.set(log,{uid,operation,amount,previousBalance:before,newBalance:after,reason,createdAt:stamp});});
      await audit(database,'currency_adjusted',actor,{uid,reason});
      send(res,200,{ok:true,uid,before,after},origin); return true;
    }
    if (action === 'reports') {
      const s=await database.collection('reports').orderBy('createdAt','desc').limit(30).get();
      send(res,200,{ok:true,reports:s.docs.map(d=>({id:d.id,type:d.data().type||'Report',description:d.data().description||d.data().reason||'',reporterUid:d.data().reporterUid||'',status:d.data().status||'open'}))},origin); return true;
    }
    if (action === 'report_update') {
      const id=String(input.id||''), status=String(input.status||'');
      if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)||!['open','resolved','dismissed','closed'].includes(status)){send(res,400,{error:'Valid report ID and status required.'},origin);return true;}
      await database.collection('reports').doc(id).update({status,updatedAt:stamp}); await audit(database,'report_'+status,actor,{reason:id});
      send(res,200,{ok:true,id,status},origin); return true;
    }
    if (action === 'announcements') {
      const s=await database.collection('announcements').orderBy('createdAt','desc').limit(30).get();
      send(res,200,{ok:true,announcements:s.docs.map(d=>({id:d.id,title:d.data().title||'',body:d.data().body||'',active:d.data().active!==false}))},origin); return true;
    }
    if (action === 'announcement_create') {
      const title=String(input.title||'').trim().slice(0,120), text=String(input.body||'').trim().slice(0,1500);
      if(!title||!text){send(res,400,{error:'Title and body required.'},origin);return true;}
      const ref=await database.collection('announcements').add({title,body:text,active:true,createdAt:stamp,createdByEmail:'Discord admin '+actor});
      await audit(database,'announcement_published',actor,{reason:title});send(res,200,{ok:true,id:ref.id},origin);return true;
    }
    if (action === 'announcement_delete') {
      const id=String(input.id||'');if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)){send(res,400,{error:'Invalid announcement ID.'},origin);return true;}
      await database.collection('announcements').doc(id).delete();await audit(database,'announcement_deleted',actor,{reason:id});
      send(res,200,{ok:true,id},origin);return true;
    }
    if (action === 'games') {
      const s=await database.collection('games').limit(100).get();
      send(res,200,{ok:true,games:s.docs.map(d=>({slug:d.id,...d.data()}))},origin);return true;
    }
    if (action === 'game_update') {
      const slug=String(input.slug||''), title=String(input.title||'').trim().slice(0,120), category=String(input.category||'Games').slice(0,60), description=String(input.description||'').slice(0,500), enabled=input.enabled;
      if(!/^[A-Za-z0-9_-]{1,80}$/.test(slug)||!title||typeof enabled!=='boolean'){send(res,400,{error:'Valid slug, title and enabled value required.'},origin);return true;}
      await database.collection('games').doc(slug).set({slug,title,category,description,enabled,updatedAt:stamp},{merge:true});await audit(database,'game_settings_updated',actor,{reason:slug});
      send(res,200,{ok:true,slug,enabled},origin);return true;
    }
    if (action === 'activity') {
      const s=await database.collection('adminAuditLog').orderBy('createdAt','desc').limit(30).get();
      send(res,200,{ok:true,activity:s.docs.map(d=>({action:d.data().action||'Admin action',targetUid:d.data().targetUid||'',reason:d.data().reason||'',createdAt:d.data().createdAt?.toDate?.()?.toISOString?.()||null}))},origin);return true;
    }
    send(res,400,{error:'Unknown admin action.'},origin); return true;
  } catch (error) {
    console.error('[Discord admin API]',error);
    send(res,Number(error.status)||500,{error:String(error.message||'Admin operation failed.').slice(0,220)},origin); return true;
  }
}
module.exports = { handle };
