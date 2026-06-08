import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore,
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let activeProfileId = localStorage.getItem("activeProfileId");

function money(amount) {
    return Number(amount || 0).toFixed(0);
}

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUser = user;

    if (!activeProfileId) {
        window.location.href = "profiles.html";
        return;
    }

});

document.getElementById("calculateFinalBtn")
.addEventListener("click", generateFinalAccounts);

async function generateFinalAccounts() {

    const openingStock = Number(
        document.getElementById("openingStockInput").value || 0
    );

    const closingStock = Number(
        document.getElementById("closingStockInput").value || 0
    );

    const q = query(
        collection(db, "journalEntries"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const snapshot = await getDocs(q);

    let accounts = {};

    snapshot.forEach(doc => {
        const data = doc.data();

        if (!accounts[data.debitAccount]) accounts[data.debitAccount] = 0;
        if (!accounts[data.creditAccount]) accounts[data.creditAccount] = 0;

        accounts[data.debitAccount] += Number(data.amount);
        accounts[data.creditAccount] -= Number(data.amount);
    });

    buildTradingAccount(accounts, openingStock, closingStock);
    buildPLAccount(accounts, openingStock, closingStock);
    buildBalanceSheet(accounts, closingStock);
}

function buildTradingAccount(accounts, openingStock, closingStock) {

    const tradingBody = document.getElementById("tradingBody");
    tradingBody.innerHTML = "";

    let debitTotal = 0;
    let creditTotal = 0;

    // =========================
    // 🔹 DIRECT EXPENSES (DEBIT SIDE)
    // =========================

    function addDebit(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${name}</td>
            <td>${money(amount)}</td>
            <td></td>
            <td></td>
        `;
        tradingBody.appendChild(row);
        debitTotal += amount;
    }

    function addCredit(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td></td>
            <td></td>
            <td>${name}</td>
            <td>${money(amount)}</td>
        `;
        tradingBody.appendChild(row);
        creditTotal += amount;
    }

    // Opening Stock
    addDebit("Opening Stock", openingStock);

    // Purchases
    addDebit("Purchases", Math.max(0, accounts["Purchases"] || 0));

    // Wages
    addDebit("Wages", Math.max(0, accounts["Wages"] || 0));

    // Carriage Inwards
    addDebit("Carriage Inwards", Math.max(0, accounts["CarriageInwards"] || 0));

    // =========================
    // 🔹 REVENUE (CREDIT SIDE)
    // =========================

    addCredit("Sales", Math.abs(accounts["Sales"] || 0));

    // Closing Stock
    addCredit("Closing Stock", closingStock);

    // =========================
    // 🔹 GROSS PROFIT / LOSS
    // =========================
if (closingStock > (openingStock + (accounts["Purchases"] || 0))) {
    alert("Warning: Closing stock unusually high compared to purchases.");
}
    let grossResult = creditTotal - debitTotal;

    if (grossResult > 0) {
        addDebit("Gross Profit c/d", grossResult);
        
    } else if (grossResult < 0) {
        addCredit("Gross Loss c/d", Math.abs(grossResult));
       
    }

    // =========================
    // 🔹 TOTAL ROW
    // =========================

    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${money(debitTotal)}</strong></td>
        <td><strong>Total</strong></td>
        <td><strong>${money(creditTotal)}</strong></td>
    `;
    tradingBody.appendChild(totalRow);

    // Save gross result globally for P&L
    window.grossResult = grossResult;
}

function buildPLAccount(accounts, openingStock, closingStock) {

    const plBody = document.getElementById("plBody");
    plBody.innerHTML = "";

    let debitTotal = 0;
    let creditTotal = 0;

    function addDebit(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${name}</td>
            <td>${money(amount)}</td>
            <td></td>
            <td></td>
        `;
        plBody.appendChild(row);
        debitTotal += amount;
    }

    function addCredit(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td></td>
            <td></td>
            <td>${name}</td>
            <td>${money(amount)}</td>
        `;
        plBody.appendChild(row);
        creditTotal += amount;
    }

    // =========================
    // 🔹 GROSS PROFIT / LOSS B/F
    // =========================

    if (window.grossResult > 0) {
        addCredit("Gross Profit b/d", window.grossResult);
    } else if (window.grossResult < 0) {
        addDebit("Gross Loss b/d", Math.abs(window.grossResult));
    }

    // =========================
    // 🔹 INDIRECT EXPENSES (DEBIT SIDE)
    // =========================

    addDebit("Salary", Math.max(0, accounts["Salary"] || 0));
    addDebit("Rent", Math.max(0, accounts["Rent"] || 0));
    addDebit("Electricity", Math.max(0, accounts["Electricity"] || 0));

    // =========================
    // 🔹 NET PROFIT / LOSS
    // =========================

    let netResult = creditTotal - debitTotal;

    if (netResult > 0) {
        addDebit("Net Profit transferred to Capital", netResult);
       
    } else if (netResult < 0) {
        addCredit("Net Loss transferred to Capital", Math.abs(netResult));
       
    }

    // =========================
    // 🔹 TOTAL ROW
    // =========================

    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${money(debitTotal)}</strong></td>
        <td><strong>Total</strong></td>
        <td><strong>${money(creditTotal)}</strong></td>
    `;
    plBody.appendChild(totalRow);

    // Save net result globally for Balance Sheet
    window.netResult = netResult;
}

function buildBalanceSheet(accounts, closingStock) {

    const bsBody = document.getElementById("balanceSheetBody");
    bsBody.innerHTML = "";

    let totalAssets = 0;
    let totalLiabilities = 0;

    function addAsset(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td></td>
            <td></td>
            <td>${name}</td>
            <td>${money(amount)}</td>
        `;
        bsBody.appendChild(row);
        totalAssets += amount;
    }

    function addLiability(name, amount) {
        if (amount === 0) return;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${name}</td>
            <td>${money(amount)}</td>
            <td></td>
            <td></td>
        `;
        bsBody.appendChild(row);
        totalLiabilities += amount;
    }

    // =========================
    // 🔹 ASSETS
    // =========================

    addAsset("Cash", Math.max(0, accounts["Cash"] || 0));
    addAsset("Bank", Math.max(0, accounts["Bank"] || 0));
    addAsset("Land", Math.max(0, accounts["Land"] || 0));
    addAsset("Building", Math.max(0, accounts["Building"] || 0));
    addAsset("Equipment", Math.max(0, accounts["Equipment"] || 0));

    // Closing Stock
    addAsset("Closing Stock", closingStock);

    // =========================
    // 🔹 LIABILITIES
    // =========================

    addLiability("Accounts Payable", Math.abs(accounts["AccountsPayable"] || 0));
    addLiability("Loans Payable", Math.abs(accounts["LoansPayable"] || 0));

    // =========================
    // 🔹 CAPITAL ADJUSTMENT
    // =========================
let capital = Math.abs(accounts["Capital"] || 0);

// Add Net Profit / subtract Net Loss
capital += window.netResult || 0;

addLiability("Capital", capital);

    // =========================
    // 🔹 TOTAL ROW
    // =========================

    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `
        <td><strong>Total</strong></td>
        <td><strong>${money(totalLiabilities)}</strong></td>
        <td><strong>Total</strong></td>
        <td><strong>${money(totalAssets)}</strong></td>
    `;
    bsBody.appendChild(totalRow);

    // =========================
    // 🔹 BALANCE CHECK
    // =========================

    if (Math.abs(totalAssets - totalLiabilities) > 0.5) {
        alert("Balance Sheet does NOT tally. Check journal entries.");
    }
}
