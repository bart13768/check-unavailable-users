// index.js
const admin = require("firebase-admin");

// 🔑 Service Account depuis GitHub Secrets
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkUnavailableUsers() {
  try {
    const now = new Date();
    const snapshot = await db.collection("users")
      .where("is_unavailable_active", "==", true)
      .get();

    let updatedCount = 0;
    for (const doc of snapshot.docs) {
      const user = doc.data();
      if (user.end_unavailable && user.end_unavailable.toDate && user.end_unavailable.toDate() < now) {
        await doc.ref.update({
          status: "disponible",
          is_unavailable_active: false,
        });
        updatedCount++;
      }
    }
    console.log(`✅ ${updatedCount} utilisateurs mis à jour à ${now.toISOString()}`);
  } catch (err) {
    console.error("Erreur:", err);
  }
}

checkUnavailableUsers();
