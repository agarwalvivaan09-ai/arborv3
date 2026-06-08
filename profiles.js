// ==========================
// 🔹 FIREBASE IMPORTS
// ==========================
console.log("PROFILES JS LOADED");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ==========================
// 🔹 FIREBASE CONFIG
// ==========================

const firebaseConfig = {
  apiKey: "AIzaSyD-aNwo7FYCvoUuk39-Zhh7PlY5GXn_7QI",
  authDomain: "arbor-2f198.firebaseapp.com",
  projectId: "arbor-2f198",
  storageBucket: "arbor-2f198.firebasestorage.app",
  messagingSenderId: "737678584809",
  appId: "1:737678584809:web:e62efd7418b65396283978"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;


// ==========================
// 🔹 AUTH CHECK
// ==========================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;
    loadProfiles();
});


// ==========================
// 🔹 LOAD PROFILES
// ==========================

async function loadProfiles() {
if (!currentUser) return;
    const grid = document.getElementById("profilesGrid");
    if (!grid) return;

    // Remove existing dynamic cards
    const oldCards = document.querySelectorAll(".dynamic-profile");
    oldCards.forEach(card => card.remove());

    const q = query(
        collection(db, "profiles"),
        where("uid", "==", currentUser.uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("profile-card", "dynamic-profile");
    emptyMessage.innerHTML = `
        <h3>No Profiles Yet</h3>
        <span>Create one to get started</span>
    `;
    grid.prepend(emptyMessage);
    return;
}

    snapshot.forEach(doc => {
        console.log("Profile found:", doc.data());
        const data = doc.data();

        const card = document.createElement("div");
        card.classList.add("profile-card", "dynamic-profile");

        card.innerHTML = `
            <h3>${data.name}</h3>
            <span>${data.mode}</span>
        `;

       card.addEventListener("click", () => {

    const normalizedMode = data.mode.trim().toLowerCase();

    localStorage.setItem("activeProfileId", doc.id);
    localStorage.setItem("activeProfileMode", normalizedMode);

    console.log("Selected mode:", normalizedMode);

    if (normalizedMode === "business") {
        window.location.href = "business.html";
    } else {
        window.location.href = "dashboard.html";
    }
});

        grid.prepend(card);
    });
}


// ==========================
// 🔹 CREATE PROFILE
// ==========================

document.addEventListener("DOMContentLoaded", () => {

    const newProfileBtn = document.querySelector(".new-profile");
    if (!newProfileBtn) return;

    newProfileBtn.addEventListener("click", async () => {

        if (!currentUser) {
            alert("User not loaded yet. Wait 1 second and try again.");
            return;
        }

        const name = prompt("Enter profile name:");
        if (!name) return;

        let mode = prompt("Enter mode (Personal / Business / Family):");
        if (!mode) return;

        mode = mode.trim().toLowerCase();

        if (!["personal", "business", "family"].includes(mode)) {
            alert("Invalid mode. Must be Personal, Business, or Family.");
            return;
        }

        try {

            await addDoc(collection(db, "profiles"), {
                uid: currentUser.uid,
                name: name.trim(),
                mode: mode,
                cashBalance: 0,
                createdAt: new Date()
            });

            console.log("Profile created successfully");
            loadProfiles();

        } catch (error) {
            console.error("Profile creation failed:", error);
        }
    });

});