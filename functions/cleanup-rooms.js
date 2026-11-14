const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret");
const serviceAccount = JSON.parse(raw);
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://play-hub-688e8-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}
const db = getDatabase();
const TTL = 60 * 60 * 1000;
const CUTOFF = Date.now() - TTL;

async function cleanupRooms(path, matchPath) {
  const snap = await db.ref(path).orderByChild("updatedAt").endAt(CUTOFF).once("value");
  const updates = {};
  let rooms = 0, matches = 0;
  snap.forEach(child => {
    const room = child.val() || {};
    const stamp = Number(room.updatedAt || room.createdAt || 0);
    if (!stamp || stamp > CUTOFF) return;
    updates[`${path}/${child.key}`] = null;
    rooms++;
    if (room.matchId) {
      updates[`${matchPath}/${room.matchId}`] = null;
      matches++;
    }
  });
  if (Object.keys(updates).length) await db.ref().update(updates);
  return { rooms, linkedMatches: matches };
}

async function cleanupOrphanMatches(path) {
  const snap = await db.ref(path).orderByChild("createdAt").endAt(CUTOFF).once("value");
  const updates = {};
  let removed = 0;
  snap.forEach(child => {
    const match = child.val() || {};
    const createdAt = Number(match.createdAt || 0);
    if (createdAt && createdAt <= CUTOFF) {
      updates[`${path}/${child.key}`] = null;
      removed++;
    }
  });
  if (Object.keys(updates).length) await db.ref().update(updates);
  return removed;
}

(async () => {
  const totals = { rooms: 0, linkedMatches: 0, oldMatches: 0 };
  for (const [roomPath, matchPath] of [
    ["multiplayer/rooms", "multiplayer/matches"],
    ["rooms", "matches"]
  ]) {
    const result = await cleanupRooms(roomPath, matchPath);
    totals.rooms += result.rooms;
    totals.linkedMatches += result.linkedMatches;
  }
  for (const path of ["multiplayer/matches", "matches"]) {
    totals.oldMatches += await cleanupOrphanMatches(path);
  }
  console.log("Firebase automatic room cleanup:", totals);
  await db.goOffline();
})().catch(error => {
  console.error("Firebase cleanup failed:", error);
  process.exit(1);
});
