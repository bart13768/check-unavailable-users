// index.js
const admin = require("firebase-admin");

// 🔑 Service Account depuis GitHub Secrets
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT n'est pas défini !");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error("❌ Impossible de parser le JSON du secret FIREBASE_SERVICE_ACCOUNT", err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkUnavailableUsers() {
  try {
    const now = new Date();
    console.log(`⏱️  Vérification des utilisateurs à ${now.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`);

    const snapshot = await db.collection("users")
      .where("is_unavailable_active", "==", true)
      .get();

    if (snapshot.empty) {
      console.log("✅ Aucun utilisateur en période indisponible.");
      return;
    }

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const user = doc.data();
      const end = user.end_unavailable;

      if (!end) {
        console.log(`⚠️ Utilisateur ${doc.id} n'a pas de end_unavailable`);
        continue;
      }

      if (typeof end.toDate !== "function") {
        console.log(`⚠️ end_unavailable de ${doc.id} n'est pas un Timestamp Firestore`);
        continue;
      }

      const endDate = end.toDate(); // convert Timestamp → Date
      console.log(`Utilisateur ${doc.id} : end_unavailable = ${endDate.toISOString()}`);

      if (endDate < now) {
        await doc.ref.update({
          status: "disponible",
          is_unavailable_active: false,
        });
        updatedCount++;
        console.log(`✅ Utilisateur ${doc.id} mis à jour.`);
      } else {
        console.log(`⏳ Utilisateur ${doc.id} toujours indisponible.`);
      }
    }

    console.log(`🎯 Total utilisateurs mis à jour : ${updatedCount}`);
  } catch (err) {
    console.error("❌ Erreur lors de la vérification des utilisateurs :", err);
    process.exit(1); // exit code 1 pour signaler l’erreur à GitHub Actions
  }
}

checkUnavailableUsers();
