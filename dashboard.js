console.log("test")// ==========================
// 🔹 FIREBASE IMPORTS
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { loadFinancialCore } from "./core-finance.js";
import { getAuth, onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    setDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// ==========================
// 🔹 CONFIG
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

const activeProfileId = localStorage.getItem("activeProfileId");
const activeMode = localStorage.getItem("activeProfileMode");

if (!activeProfileId) window.location.href = "profiles.html";
if (activeMode !== "personal") window.location.href = "business.html";

let currentUser;


// ==========================
// 🔹 AUTH
// ==========================
onAuthStateChanged(auth, async (user) => {

    const addGoalBtn = document.getElementById("addGoalBtn");

if (addGoalBtn) {
    addGoalBtn.onclick = async () => {
        const name = document.getElementById("goalName").value;
        const amount = parseFloat(document.getElementById("goalAmount").value);

        await addDoc(collection(db, "goals"), {
            uid: user.uid,
            profileId: activeProfileId,
            name,
            amount
        });

        await refreshPersonal();
    };
}

    const logoutBtnHeader = document.getElementById("logoutBtnHeader");

if (logoutBtnHeader) {
    logoutBtnHeader.onclick = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };
}

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;
// 🔹 Bind Add Transaction AFTER auth is ready
const addBtn = document.getElementById("addBtn");

if (addBtn) {
    addBtn.onclick = async () => {

        const amount = parseFloat(document.getElementById("amountInput").value);
        const type = document.getElementById("typeInput").value;
        const category = document.getElementById("categoryInput").value;
        const date = document.getElementById("dateInput").value;

        if (!amount || !date) {
            alert("Fill required fields");
            return;
        }

        await addDoc(collection(db, "transactions"), {
            uid: currentUser.uid,
            profileId: activeProfileId,
            amount: Math.abs(amount),
            type,
            category,
            date,
            createdAt: new Date()
        });

        await refreshPersonal();
    };
}
    await refreshPersonal();
    // ==========================
// ADD LIABILITY
// ==========================
const addLiabilityBtn = document.getElementById("addLiabilityBtn");

if (addLiabilityBtn) {
    addLiabilityBtn.onclick = async () => {

        const type = document.getElementById("liabilityType").value;
        const principal = parseFloat(document.getElementById("principalInput").value);
        const interest = parseFloat(document.getElementById("interestInput").value);
        const monthlyPayment = parseFloat(document.getElementById("monthlyPaymentInput").value);
        const compounding = document.getElementById("liabilityCompounding")?.value || "simple";

        if (!type || !principal) return;

        await addDoc(collection(db, "liabilities"), {
            uid: user.uid,
            profileId: activeProfileId,
            type,
            principalRemaining: principal,
            interestRate: interest || 0,
            monthlyPayment: monthlyPayment || 0,
            compounding: compounding
        });

        await refreshPersonal();
    };
}

// ==========================
// ADD ASSET
// ==========================
const addAssetBtn = document.getElementById("addAssetBtn");

if (addAssetBtn) {
    addAssetBtn.onclick = async () => {

        const type = document.getElementById("assetType").value;
        const value = parseFloat(document.getElementById("assetValue").value);
        const growth = parseFloat(document.getElementById("growthRate").value);
        const assetCategory = document.getElementById("assetCategory")?.value || "general";

        if (!type || !value) return;

        await addDoc(collection(db, "assets"), {
            uid: user.uid,
            profileId: activeProfileId,
            type,
            currentValue: value,
            growthRate: growth || 0,
            category: assetCategory
        });

        await refreshPersonal();
    };
}
// ==========================
// SAVE TAX RATE
// ==========================
const saveTaxBtn = document.getElementById("saveTaxBtn");

if (saveTaxBtn) {
    saveTaxBtn.onclick = async () => {

        const taxRate = parseFloat(document.getElementById("taxRateInput").value);

        if (isNaN(taxRate)) return;

        await setDoc(doc(db, "taxSettings", activeProfileId), {
            uid: user.uid,
            profileId: activeProfileId,
            taxRate: taxRate
        });

        alert("Tax rate saved.");
    };
}
});


// ==========================
// 🔹 MAIN REFRESH
// ==========================
async function refreshPersonal() {

    const txQuery = query(
        collection(db, "transactions"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const liabilityQuery = query(
        collection(db, "liabilities"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const assetQuery = query(
        collection(db, "assets"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );
const stockQuery = query(
    collection(db, "stocks"),
    where("uid", "==", currentUser.uid),
    where("profileId", "==", activeProfileId)
);
    const txSnap = await getDocs(txQuery);
    const liabilitySnap = await getDocs(liabilityQuery);
    const assetSnap = await getDocs(assetQuery);
    const stockSnap = await getDocs(stockQuery);
// ==========================
// LOAD TAX
// ==========================
const taxDoc = await getDoc(doc(db, "taxSettings", activeProfileId));

let taxRate = 0;

if (taxDoc.exists()) {
    taxRate = (taxDoc.data().taxRate || 0) / 100;
}
    let income = 0;
    let expense = 0;
    let cash = 0;

    const txTable = document.getElementById("transactionList");
    if (txTable) txTable.innerHTML = "";

    txSnap.forEach(docSnap => {

        const d = docSnap.data();

        if (d.type === "income") {
    const grossIncome = Number(d.amount);
    const afterTaxIncome = grossIncome * (1 - taxRate);

    income += afterTaxIncome;
    cash += afterTaxIncome;
}

        if (d.type === "expense") {
            expense += Number(d.amount);
            cash -= Number(d.amount);
        }

        if (txTable) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${d.date}</td>
                <td>${d.type}</td>
                <td>${d.category}</td>
                <td>₹ ${Number(d.amount).toFixed(0)}</td>
                <td><button class="danger-btn" data-delete-transaction="${docSnap.id}">Delete</button></td>
            `;
            txTable.appendChild(row);
        }
    });

    if (txTable) {
        txTable.querySelectorAll("[data-delete-transaction]").forEach((button) => {
            button.addEventListener("click", async () => {
                if (!confirm("Delete this transaction?")) return;
                await deleteDoc(doc(db, "transactions", button.dataset.deleteTransaction));
                await refreshPersonal();
            });
        });
    }

    let totalDebt = 0;
    let monthlyDebt = 0;

    const liabilityTable = document.getElementById("liabilityList");
    if (liabilityTable) liabilityTable.innerHTML = "";

    liabilitySnap.forEach(docSnap => {
        const l = docSnap.data();

        totalDebt += Number(l.principalRemaining);
        monthlyDebt += Number(l.monthlyPayment);

        if (liabilityTable) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${l.type}</td>
                <td>₹ ${l.principalRemaining}</td>
                <td>${l.interestRate}%</td>
                <td>₹ ${l.monthlyPayment}</td>
            `;
            liabilityTable.appendChild(row);
        }
    });

    let totalAssets = 0;

    const assetTable = document.getElementById("assetList");
    if (assetTable) assetTable.innerHTML = "";

    assetSnap.forEach(docSnap => {
        const a = docSnap.data();

        totalAssets += Number(a.currentValue);

        if (assetTable) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${a.type}</td>
                <td>₹ ${a.currentValue}</td>
                <td>${a.growthRate}%</td>
            `;
            assetTable.appendChild(row);
        }
    });
    
let totalStockValue = 0;

stockSnap.forEach(docSnap => {
    const s = docSnap.data();
    const value = Number(s.quantity) * Number(s.currentPrice);

    totalStockValue += value;

    if (assetTable) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${s.ticker} (Stock)</td>
            <td>₹ ${value.toFixed(0)}</td>
            <td>Market</td>
        `;
        assetTable.appendChild(row);
    }
});

totalAssets += totalStockValue;
const coreData = await loadFinancialCore(db, currentUser, activeProfileId);

income = coreData.income;
expense = coreData.expense;

const disposableIncome = coreData.disposableIncome;
    const net = income - expense;
    const netWorth = totalAssets - totalDebt;

    let status = "Vulnerable";
    if (net > 0 && netWorth > 0) status = "Stable";
    if (net > 0 && netWorth > totalDebt) status = "Strong";

    set("totalIncome", "₹ " + income);
    set("totalExpense", "₹ " + expense);
    set("netFlow", "₹ " + (income - expense));
    set("cashBalance", "₹ " + cash);
    set("netWorthValue", "₹ " + netWorth);
    const disposableEl = document.getElementById("disposableIncome");
if (disposableEl) {
    disposableEl.innerText = "₹ " + disposableIncome.toFixed(0);
}
    set("totalDebt", "₹ " + totalDebt);
    set("monthlyDebt", "₹ " + monthlyDebt);
    set("financialStatus", status);

    // ==========================
// LOAD GOALS
// ==========================

const goalQuery = query(
    collection(db, "goals"),
    where("uid", "==", currentUser.uid),
    where("profileId", "==", activeProfileId)
);

const goalSnap = await getDocs(goalQuery);

const goalList = document.getElementById("goalList");
if (goalList) goalList.innerHTML = "";

goalSnap.forEach(docSnap => {

    const g = docSnap.data();
    const div = document.createElement("div");

    const yearlySavings = income - expense;
const remainingAmount = Math.max(0, g.amount - netWorth);

    let yearsToGoal;

    if (yearlySavings > 0) {
        yearsToGoal = (remainingAmount / yearlySavings).toFixed(1);
    } else {
        yearsToGoal = "Not achievable (no savings)";
    }

    div.innerHTML = `
        <div style="margin-bottom:12px; padding:12px; background:#1f2937; border-radius:10px;">
            <strong>${g.name}</strong><br>
            Target: ₹ ${g.amount}<br>
            <small>Time to achieve: ${yearsToGoal} years</small>
        </div>
    `;

    goalList.appendChild(div);
});
set("effectiveTax", (taxRate * 100).toFixed(1) + "%");
}


// ==========================
// 🔹 ADD TRANSACTION
// ==========================


function set(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

// ==========================
// 🔹 SIDE PANEL LOGIC
// ==========================
window.addEventListener("DOMContentLoaded", () => {

    const sidePanel = document.getElementById("sidePanel");
    const openBtn = document.getElementById("openPanelBtn");
    const closeBtn = document.getElementById("closePanelBtn");

    if (openBtn && sidePanel) {
        openBtn.addEventListener("click", () => {
            sidePanel.classList.add("open");
        });
    }

    if (closeBtn && sidePanel) {
        closeBtn.addEventListener("click", () => {
            sidePanel.classList.remove("open");
        });
    }
});
