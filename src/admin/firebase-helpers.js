// src/admin/firebase-helpers.js
// Wrappers do Firebase Realtime DB (admin)
// Extraído de admin.html Fase A

window._dbRead = async function(path, defaultVal = null) {
  const snap = await window.db.ref(path).once('value');
  return snap.exists() ? snap.val() : defaultVal;
};

window._dbSet = async function(path, value) {
  await window.db.ref(path).set(value);
};

window._dbUpdate = async function(path, updates) {
  await window.db.ref(path).update(updates);
};

window._dbPush = async function(path, value) {
  const ref = await window.db.ref(path).push(value);
  return ref.key;
};

window._dbRemove = async function(path) {
  await window.db.ref(path).remove();
};
