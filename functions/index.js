const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp({
  databaseURL: "https://play-hub-688e8-default-rtdb.asia-southeast1.firebasedatabase.app"
});

Object.assign(exports, require("./admin"));

const ROOM_TTL_MS = 60 * 60 * 1000;
const ROOM_PATHS = ["multiplayer/rooms", "rooms"];
const MATCH_PATHS = ["multiplayer/matches", "matches"];

async function cleanupRoomTree(db, roomPath, matchPath, now) {
  const roomsRef = db.ref(roomPath);
  const roomSnap = await roomsRef.once("value");
  const roomData = roomSnap.val() || {};
  const expiredCodes = new Set();
  const updates = {};
  let removedRooms = 0;

  for (const [code, room] of Object.entries(roomData)) {
    if (!room || typeof room !== "object") continue;
    const createdAt = Number(room.createdAt || room.startedAt || 0);
    const updatedAt = Number(room.updatedAt || room.lastSeen || createdAt);
    const lastActivity = Math.max(createdAt, updatedAt);
    if (!lastActivity || now - lastActivity < ROOM_TTL_MS) continue;
    expiredCodes.add(code);
    updates[`${roomPath}/${code}`] = null;
    removedRooms++;
    if (room.matchId && matchPath) updates[`${matchPath}/${room.matchId}`] = null;
  }

  let removedMatches = 0;
  if (matchPath) {
    const matchSnap = await db.ref(matchPath).once("value");
    const matchData = matchSnap.val() || {};
    const liveRoomCodes = new Set(Object.keys(roomData).filter(code => !expiredCodes.has(code)));
    for (const [id, match] of Object.entries(matchData)) {
      if (!match || typeof match !== "object") continue;
      const code = String(match.roomCode || match.roomId || "");
      const createdAt = Number(match.createdAt || match.startedAt || 0);
      const roomStillExists = code && liveRoomCodes.has(code);
      const expired = createdAt > 0 && now - createdAt >= ROOM_TTL_MS;
      if (expiredCodes.has(code) || (!roomStillExists && expired)) {
        updates[`${matchPath}/${id}`] = null;
        removedMatches++;
      }
    }
  }

  if (Object.keys(updates).length) await db.ref().update(updates);
  return { removedRooms, removedMatches };
}

// Server-side expiry: room and its match are removed after one hour without activity.
// The scheduler runs every five minutes, so cleanup happens within roughly 5 minutes
// after the one-hour expiry threshold. Active rooms stay alive via room.updatedAt heartbeat.
exports.cleanupInactiveMultiplayerRooms = onSchedule(
  { schedule: "every 5 minutes", timeZone: "Asia/Kolkata", region: "asia-south1" },
  async () => {
    const db = getDatabase();
    const now = Date.now();
    const results = [];
    for (const roomPath of ROOM_PATHS) {
      const matchPath = roomPath === "multiplayer/rooms" ? "multiplayer/matches" : "matches";
      results.push(await cleanupRoomTree(db, roomPath, matchPath, now));
    }
    const totals = results.reduce((a, x) => ({
      rooms: a.rooms + x.removedRooms,
      matches: a.matches + x.removedMatches
    }), { rooms: 0, matches: 0 });
    console.log("Automatic multiplayer cleanup complete", totals);
  }
);
