const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const db = getFirestore();
const approved = new Set(["firegamingugw@gmail.com", "mranit66@gmail.com"]);
function signedIn(req) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return req.auth;
}
function admin(req) {
  const a = signedIn(req);
  if (!approved.has(String(a.token.email || "").toLowerCase()) || a.token.admin !== true)
    throw new HttpsError("permission-denied", "Admin access required.");
  return a;
}
exports.checkAccountStatus = onCall({ region: "asia-south1" }, async req => {
  const auth = signedIn(req);
  const snap = await db.collection("users").doc(auth.uid).get();
  return { banned: snap.exists && snap.data().banned === true };
});
exports.bootstrapAdmin = onCall({ region: "asia-south1" }, async req => {
  const a = signedIn(req), email = String(a.token.email || "").toLowerCase();
  if (!approved.has(email) || a.token.email_verified !== true)
    throw new HttpsError("permission-denied", "This Google account is not an approved admin.");
  const user = await getAuth().getUser(a.uid);
  await getAuth().setCustomUserClaims(a.uid, { ...(user.customClaims || {}), admin: true });
  return { success: true, refreshToken: true };
});
exports.adminOverview = onCall({ region: "asia-south1" }, async req => {
  admin(req);
  const [u, r, a, g] = await Promise.all([
    db.collection("users").get(),
    db.collection("reports").where("status", "==", "open").get().catch(() => ({ size: 0 })),
    db.collection("announcements").get(), db.collection("games").get()
  ]);
  return { users: u.size, bannedUsers: u.docs.filter(x => x.data().banned === true).length,
    openReports: r.size, announcements: a.size, games: g.size };
});
exports.adminListUsers = onCall({ region: "asia-south1" }, async req => {
  admin(req);
  const result = await getAuth().listUsers(Math.min(Math.max(Number(req.data?.pageSize) || 100, 1), 200));
  const profiles = await Promise.all(result.users.map(u => db.collection("users").doc(u.uid).get()));
  return { users: result.users.map((u, i) => {
    const p = profiles[i].exists ? profiles[i].data() : {};
    return { uid:u.uid, email:u.email || "", displayName:p.displayName || u.displayName || "",
      username:p.username || "", photoURL:p.photoURL || u.photoURL || "", banned:p.banned === true,
      currencyBalance:Number(p.currencyBalance || 0), createdAt:u.metadata.creationTime || "" };
  }), pageToken:result.pageToken || null };
});
exports.adminSetUserBan = onCall({ region: "asia-south1" }, async req => {
  const a = admin(req), uid = String(req.data?.uid || ""), banned = req.data?.banned;
  const reason = String(req.data?.reason || "").trim().slice(0, 500);
  if (!uid || typeof banned !== "boolean") throw new HttpsError("invalid-argument", "User and ban status required.");
  if (uid === a.uid) throw new HttpsError("failed-precondition", "You cannot ban your own admin account.");
  const target = await getAuth().getUser(uid);
  await db.collection("users").doc(uid).set({ banned, banReason:banned ? reason : "",
    bannedAt:banned ? FieldValue.serverTimestamp() : null, bannedBy:banned ? a.uid : null,
    updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  await db.collection("adminAuditLog").add({ action:banned ? "user_banned" : "user_unbanned",
    targetUid:uid, targetEmail:target.email || "", reason, adminUid:a.uid,
    adminEmail:a.token.email, createdAt:FieldValue.serverTimestamp() });
  return { success:true };
});
exports.adminAdjustCurrency = onCall({ region: "asia-south1" }, async req => {
  const a = admin(req), uid = String(req.data?.uid || ""), amount = Number(req.data?.amount);
  const operation = req.data?.operation, reason = String(req.data?.reason || "").trim().slice(0,500);
  if (!uid || !Number.isSafeInteger(amount) || amount <= 0 ||
      !["add","remove","set"].includes(operation) || !reason)
    throw new HttpsError("invalid-argument", "User, positive whole amount, operation and reason required.");
  const userRef = db.collection("users").doc(uid), logRef = db.collection("currencyTransactions").doc();
  const balances = await db.runTransaction(async tx => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError("not-found", "User profile not found.");
    const before = Math.max(0, Number(snap.data().currencyBalance || 0));
    const after = operation === "add" ? before + amount : operation === "remove" ? before - amount : amount;
    if (!Number.isSafeInteger(after) || after < 0) throw new HttpsError("failed-precondition", "Insufficient balance or invalid balance.");
    tx.set(userRef, { currencyBalance:after, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    tx.set(logRef, { uid, operation, amount, previousBalance:before, newBalance:after, reason,
      adminUid:a.uid, adminEmail:a.token.email, createdAt:FieldValue.serverTimestamp() });
    return { previousBalance:before, newBalance:after };
  });
  return { success:true, ...balances };
});
exports.adminSaveGame = onCall({ region: "asia-south1" }, async req => {
  const a = admin(req), slug = String(req.data?.slug || "").trim();
  const title = String(req.data?.title || "").trim().slice(0,120);
  const description = String(req.data?.description || "").trim().slice(0,500);
  const category = String(req.data?.category || "Games").trim().slice(0,60);
  const enabled = req.data?.enabled !== false;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(slug) || !title)
    throw new HttpsError("invalid-argument", "Choose a valid existing game and provide a title.");
  await db.collection("games").doc(slug).set({ slug, title, description, category, enabled,
    updatedAt:FieldValue.serverTimestamp(), updatedBy:a.uid }, { merge:true });
  return { success:true };
});
exports.adminDeleteGameOverride = onCall({ region: "asia-south1" }, async req => {
  admin(req);
  const slug = String(req.data?.slug || "");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(slug)) throw new HttpsError("invalid-argument", "Invalid game slug.");
  await db.collection("games").doc(slug).delete();
  return { success:true };
});
exports.adminListReports = onCall({ region: "asia-south1" }, async req => {
  admin(req);
  const s = await db.collection("reports").orderBy("createdAt","desc").limit(100).get().catch(() => null);
  return { reports:s ? s.docs.map(d => ({ id:d.id, ...d.data() })) : [] };
});
exports.adminManageAnnouncement = onCall({ region: "asia-south1" }, async req => {
  const a = admin(req), title = String(req.data?.title || "").trim().slice(0,120);
  const body = String(req.data?.body || "").trim().slice(0,3000);
  if (!title || !body) throw new HttpsError("invalid-argument", "Title and message required.");
  const ref = await db.collection("announcements").add({ title, body, active:req.data?.active !== false,
    createdAt:FieldValue.serverTimestamp(), createdBy:a.uid, createdByEmail:a.token.email });
  return { success:true, id:ref.id };
});
exports.adminDeleteAnnouncement = onCall({ region: "asia-south1" }, async req => {
  const a = admin(req), id = String(req.data?.id || "");
  if (!id) throw new HttpsError("invalid-argument", "Announcement ID required.");
  await db.collection("announcements").doc(id).delete();
  await db.collection("adminAuditLog").add({ action:"announcement_deleted", targetId:id,
    adminUid:a.uid, adminEmail:a.token.email, createdAt:FieldValue.serverTimestamp() });
  return { success:true };
});
