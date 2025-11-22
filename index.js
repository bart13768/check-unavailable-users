const admin = require("firebase-admin");

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT n'est pas défini !");
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkUnavailableUsers() {
  const now = new Date();
  
  console.log(`⏱️ Vérification à ${now.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`);

  // 🔍 On récupère les utilisateurs dont le statut est "indisponible"
  const snapshot = await db.collection("users")
    .where("statut", "==", "🛑")
    .get();

  if (snapshot.empty) {
    console.log("⚠️ Aucun utilisateur en statut indisponible.");
    return;
  }

  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const user = doc.data();

    if (!user.end_unavailable || !user.end_unavailable.toDate) {
      console.log(`⚠️ Utilisateur ${doc.id} sans date de fin valide`);
      continue;
    }

    const endDate = user.end_unavailable.toDate();
    console.log(`Utilisateur ${doc.id}: fin prévue → ${endDate.toLocaleString("fr-FR")}`);

    if (endDate < now) {
      await doc.ref.update({
        statut: "🟢",
      });

      updatedCount++;
      console.log(`✅ ${doc.id} → maintenant disponible ✔`);
    } else {
      console.log(`⏳ ${doc.id} encore indisponible`);
    }
  }

  console.log(`🎯 Total mis à jour : ${updatedCount}`);
}

checkUnavailableUsers();
