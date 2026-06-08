
// ==========================
// 🔹 IMPORTS
// ==========================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
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
  updateDoc,
  increment,
  deleteDoc
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
const activeMode = localStorage.getItem("activeProfileMode");

if (!activeMode) {
    window.location.href = "profiles.html";
}

if (activeMode !== "business") {
    window.location.href = "dashboard.html";
}
// ==========================
// 🔹 GLOBAL STATE
// ==========================
let currentUser = null;

let cachedTransactions = [];
let cachedLiabilities = [];
let cachedAssets = [];
let cachedCashBalance = 0;
let cachedBaseMetrics = null;

const ACCOUNT_TYPES = {
    ASSET: "Asset",
    LIABILITY: "Liability",
    CAPITAL: "Capital",
    REVENUE: "Revenue",
    DIRECT_EXPENSE: "Direct Expense",
    INDIRECT_EXPENSE: "Indirect Expense"
};

const CHART_OF_ACCOUNTS = {
    Cash: ACCOUNT_TYPES.ASSET,
    Bank: ACCOUNT_TYPES.ASSET,
    Land: ACCOUNT_TYPES.ASSET,
    Building: ACCOUNT_TYPES.ASSET,
    Equipment: ACCOUNT_TYPES.ASSET,
    OpeningStock: ACCOUNT_TYPES.DIRECT_EXPENSE,

    AccountsPayable: ACCOUNT_TYPES.LIABILITY,
    LoansPayable: ACCOUNT_TYPES.LIABILITY,

    Capital: ACCOUNT_TYPES.CAPITAL,

    Sales: ACCOUNT_TYPES.REVENUE,

    Purchases: ACCOUNT_TYPES.DIRECT_EXPENSE,
    Wages: ACCOUNT_TYPES.DIRECT_EXPENSE,
    CarriageInwards: ACCOUNT_TYPES.DIRECT_EXPENSE,

    Salary: ACCOUNT_TYPES.INDIRECT_EXPENSE,
    Rent: ACCOUNT_TYPES.INDIRECT_EXPENSE,
    Electricity: ACCOUNT_TYPES.INDIRECT_EXPENSE
};

// ==========================
// 🔹 ACTIVE PROFILE STATE
// ==========================

let activeProfileId = localStorage.getItem("activeProfileId");

console.log("Active Profile ID:", activeProfileId);

if (!activeProfileId) {
    window.location.href = "profiles.html";
}



// ==========================
// 🔹 AUTH STATE
// ==========================
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

    const userEmailElement = document.getElementById("userEmail");
    if (userEmailElement) {
        userEmailElement.innerText = "Logged in as: " + user.email;
    }

    await ensureUserDocExists(user);
    await loadActiveProfileName();

    // 🔹 Always build KPIs
    const accountMap = await buildTrialBalanceData();
    const kpis = calculateKPIs(accountMap);
    renderDashboardKPIs(kpis);
    renderAnalyticsKPIs(kpis);

    if (
        document.getElementById("transactionList") ||
        document.getElementById("liabilityList") ||
        document.getElementById("assetList")
    ) {
        await loadData();
    }

    // 🔹 Load page-specific components ONLY if they exist
    if (document.getElementById("journalList")) {
        await loadJournal();
    }

    if (document.getElementById("trialTableBody")) {
        await loadTrialBalance();
    }

    if (document.getElementById("ledgerTableBody")) {
        // ledger loads only when dropdown selected
    }
});

// ==========================
// 🔹 ENSURE USER DOC
// ==========================
async function ensureUserDocExists(user) {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        await setDoc(userRef, {
            email: user.email,
            currentCashBalance: 0,
            createdAt: new Date()
        });
    }
}
// ==========================
// 🔹 LOAD ACTIVE PROFILE NAME
// ==========================
async function loadActiveProfileName() {
    const profileRef = doc(db, "profiles", activeProfileId);
    const docSnap = await getDoc(profileRef);

    if (docSnap.exists()) {
        const profileElement = document.getElementById("activeProfileName");

if (profileElement && docSnap.exists()) {
    profileElement.innerText =
        docSnap.data().name + " (" + docSnap.data().mode + ")";
}
    }
}

// ==========================
// 🔹 LOAD DATA (NO UI LOGIC)
// ==========================
async function loadData() {

    // Transactions
    const txQuery = query(
        
    collection(db, "transactions"),
    where("uid", "==", currentUser.uid),
    where("profileId", "==", activeProfileId)
);console.log("Querying with:", currentUser.uid, activeProfileId);
    const txSnapshot = await getDocs(txQuery);

    const transactions = [];
    txSnapshot.forEach(doc => transactions.push(doc.data()));
    const listDiv = document.getElementById("transactionList");
if (!listDiv) return;
listDiv.innerHTML = "";

transactions.forEach(data => {

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${data.date || "-"}</td>
        <td>${data.type?.toUpperCase() || "-"}</td>
        <td>${data.category || "-"}</td>
        <td>₹ ${Number(data.amount).toFixed(0)}</td>
    `;

    listDiv.appendChild(row);
});



    // Liabilities
    const liabilityQuery = query(
    collection(db, "liabilities"),
    where("uid", "==", currentUser.uid),
    where("profileId", "==", activeProfileId)
);
    const liabilitySnapshot = await getDocs(liabilityQuery);
    console.log("Liabilities found:", liabilitySnapshot.docs.length);

    const liabilities = [];
    liabilitySnapshot.forEach(doc => liabilities.push(doc.data()));
    
    const liabilityList = document.getElementById("liabilityList");
if (!liabilityList) return;
liabilityList.innerHTML = "";

liabilities.forEach(data => {

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${data.type}</td>
        <td>₹ ${Number(data.principalRemaining).toFixed(0)}</td>
        <td>${data.interestRate || 0}%</td>
        <td>₹ ${Number(data.monthlyPayment).toFixed(0)}</td>
    `;

    liabilityList.appendChild(row);
});

    // Assets
    const assetQuery = query(
    collection(db, "assets"),
    where("uid", "==", currentUser.uid),
    where("profileId", "==", activeProfileId)
);
    const assetSnapshot = await getDocs(assetQuery);
    console.log("Assets found:", assetSnapshot.docs.length);

    const assets = [];
    assetSnapshot.forEach(doc => assets.push(doc.data()));
   const assetList = document.getElementById("assetList");
if (!assetList) return;
assetList.innerHTML = "";

assets.forEach(data => {

    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${data.type}</td>
        <td>₹ ${Number(data.currentValue).toFixed(0)}</td>
        <td>${data.growthRate || 0}%</td>
    `;

    assetList.appendChild(row);
});

    // Cash Balance (Profile Level)
const profileRef = doc(db, "profiles", activeProfileId);
const profileSnap = await getDoc(profileRef);

const cashBalance = profileSnap.exists()
    ? profileSnap.data().cashBalance || 0
    : 0;

    // Cache
    cachedTransactions = transactions;
    cachedLiabilities = liabilities;
    cachedAssets = assets;
    cachedCashBalance = cashBalance;

    
    

}










   
// ==========================
// 🔹 DETERMINISTIC PROJECTION ENGINE
// ==========================
function runProjectionEngine({
    baseIncome,
    baseExpense,
    baseAssets,
    baseLiabilities,
    incomeGrowthRate,
    expenseGrowthRate,
    assetGrowthRate,
    years
}) {

    let yearlyData = [];
    let insolvencyYear = null;

    let income = baseIncome;
    let expense = baseExpense;
    let assets = baseAssets;
    let liabilities = baseLiabilities;

    for (let year = 1; year <= years; year++) {

        income = income * (1 + incomeGrowthRate);
        expense = expense * (1 + expenseGrowthRate);

        const yearlySavings = income - expense;

        assets = assets * (1 + assetGrowthRate) + yearlySavings;

        const netWorth = assets - liabilities;

        if (assets <= 0 && insolvencyYear === null) {
            insolvencyYear = year;
        }

        yearlyData.push({
            year,
            income,
            expense,
            yearlySavings,
            assets,
            netWorth
        });
    }

    return {
        yearlyData,
        insolvencyYear
    };
}

// ==========================
// 🔹 ANIMATION
// ==========================
function animateValue(element, start, end, duration) {
    let startTime = null;

    function animation(currentTime) {
        if (!startTime) startTime = currentTime;
        const progress = currentTime - startTime;
        const percentage = Math.min(progress / duration, 1);
        const value = start + (end - start) * percentage;

        element.innerText = "₹ " + value.toFixed(0);

        if (percentage < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}


// ==========================
// 🔹 DOM READY
// ==========================
// Load account options
// Load account options safely
const debitSelect = document.getElementById("debitAccount");
const creditSelect = document.getElementById("creditAccount");

if (debitSelect && creditSelect) {
    Object.keys(CHART_OF_ACCOUNTS).forEach(account => {
        const option1 = document.createElement("option");
        option1.value = account;
        option1.textContent = account;
        debitSelect.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = account;
        option2.textContent = account;
        creditSelect.appendChild(option2);
    });
}
// Populate ledger account dropdown
const ledgerSelect = document.getElementById("ledgerAccountSelect");

if (ledgerSelect) {
    Object.keys(CHART_OF_ACCOUNTS).forEach(account => {
        const option = document.createElement("option");
        option.value = account;
        option.textContent = account;
        ledgerSelect.appendChild(option);
    });

    ledgerSelect.addEventListener("change", (e) => {
        const selected = e.target.value;
        if (selected) loadLedger(selected);
    });
}async function buildTrialBalanceData() {

    const accountMap = {};

    const q = query(
        collection(db, "journalEntries"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const data = doc.data();

        const debitAcc = data.debitAccount;
        const creditAcc = data.creditAccount;
        const amount = Number(data.amount);

        if (!accountMap[debitAcc]) {
            accountMap[debitAcc] = { debit: 0, credit: 0 };
        }

        if (!accountMap[creditAcc]) {
            accountMap[creditAcc] = { debit: 0, credit: 0 };
        }

        accountMap[debitAcc].debit += amount;
        accountMap[creditAcc].credit += amount;
    });

    return accountMap;
}
function calculateKPIs(accountMap) {

    let totalRevenue = 0;
    let totalExpense = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let capital = 0;
    let cashBalance = 0;

    Object.keys(accountMap).forEach(account => {

        const debit = accountMap[account].debit;
        const credit = accountMap[account].credit;
        const balance = debit - credit;

        const type = CHART_OF_ACCOUNTS[account];

        if (type === ACCOUNT_TYPES.REVENUE) {
            totalRevenue += credit;
        }

        if (
            type === ACCOUNT_TYPES.DIRECT_EXPENSE ||
            type === ACCOUNT_TYPES.INDIRECT_EXPENSE
        ) {
            totalExpense += debit;
        }

        if (type === ACCOUNT_TYPES.ASSET) {
            totalAssets += balance;
        }

        if (type === ACCOUNT_TYPES.LIABILITY) {
            totalLiabilities += credit - debit;
        }

        if (type === ACCOUNT_TYPES.CAPITAL) {
            capital += credit - debit;
        }

        if (account === "Cash") {
            cashBalance = balance;
        }

    });

    const netProfit = totalRevenue - totalExpense;
    const profitMargin =
        totalRevenue > 0 ? netProfit / totalRevenue : 0;

    const netWorth = totalAssets - totalLiabilities;

    return {
        totalRevenue,
        totalExpense,
        netProfit,
        profitMargin,
        totalAssets,
        totalLiabilities,
        netWorth,
        cashBalance
    };
}
function renderDashboardKPIs(kpis) {

    const revenueEl = document.getElementById("totalRevenue");
    const expenseEl = document.getElementById("totalBusinessExpense");
    const profitEl = document.getElementById("netProfit");
    const marginEl = document.getElementById("profitMargin");
    const cashEl = document.getElementById("businessCash");
    const netWorthEl = document.getElementById("netWorth");

    if (revenueEl)
        revenueEl.innerText = "₹ " + kpis.totalRevenue;

    if (expenseEl)
        expenseEl.innerText = "₹ " + kpis.totalExpense;

    if (profitEl)
        profitEl.innerText = "₹ " + kpis.netProfit;

    if (marginEl)
        marginEl.innerText =
            (kpis.profitMargin * 100).toFixed(1) + "%";

    if (cashEl)
        cashEl.innerText = "₹ " + kpis.cashBalance;

    if (netWorthEl)
        netWorthEl.innerText = "₹ " + kpis.netWorth;
}
function renderAnalyticsKPIs(kpis) {

    const roaEl = document.getElementById("roaValue");
    const debtRatioEl = document.getElementById("debtRatioValue");
    const assetTurnoverEl = document.getElementById("assetTurnoverValue");
    const lcRatioEl = document.getElementById("lcRatioValue");

    if (!roaEl) return; // Only run on analytics page

    const roa = kpis.totalAssets > 0
        ? (kpis.netProfit / kpis.totalAssets) * 100
        : 0;

    const debtRatio = kpis.totalAssets > 0
        ? (kpis.totalLiabilities / kpis.totalAssets) * 100
        : 0;

    const assetTurnover = kpis.totalAssets > 0
        ? kpis.totalRevenue / kpis.totalAssets
        : 0;

    const lcRatio = kpis.netWorth !== 0
        ? kpis.totalLiabilities / kpis.netWorth
        : 0;

    roaEl.innerText = roa.toFixed(1) + "%";
    debtRatioEl.innerText = debtRatio.toFixed(1) + "%";
    assetTurnoverEl.innerText = assetTurnover.toFixed(2);
    lcRatioEl.innerText = lcRatio.toFixed(2);
}
window.addEventListener("DOMContentLoaded", () => {

    
const addJournalBtn = document.getElementById("addJournalBtn");

if (addJournalBtn) {
    addJournalBtn.addEventListener("click", async () => {

        const date = document.getElementById("journalDate").value;
        const debitAccount = document.getElementById("debitAccount").value;
        const creditAccount = document.getElementById("creditAccount").value;
        const amount = parseFloat(document.getElementById("journalAmount").value);

        if (!date || !debitAccount || !creditAccount || !amount) {
            alert("Fill all fields");
            return;
        }

        if (debitAccount === creditAccount) {
            alert("Debit and Credit cannot be same");
            return;
        }

        await addDoc(collection(db, "journalEntries"), {
            uid: currentUser.uid,
            profileId: activeProfileId,
            date,
            debitAccount,
            creditAccount,
            amount,
            createdAt: new Date()
        });

        loadJournal();
        await loadTrialBalance();

const accountMap = await buildTrialBalanceData();
const kpis = calculateKPIs(accountMap);
renderDashboardKPIs(kpis);
renderAnalyticsKPIs(kpis);
    });
}
    // 🔹 Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            signOut(auth).then(() => {
                window.location.href = "index.html";
            });
        });
    }

    // 🔹 Side Panel
    const sidePanel = document.getElementById("sidePanel");
    const openPanelBtn = document.getElementById("openPanelBtn");
    const closePanelBtn = document.getElementById("closePanelBtn");

    if (openPanelBtn) {
        openPanelBtn.addEventListener("click", () => {
            sidePanel.classList.add("open");
        });
    }

    if (closePanelBtn) {
        closePanelBtn.addEventListener("click", () => {
            sidePanel.classList.remove("open");
        });
    }

    const addBtn = document.getElementById("addBtn");

if (addBtn) {
    addBtn.addEventListener("click", async () => {

        const amount = Math.abs(parseFloat(document.getElementById("amountInput").value));
        const type = document.getElementById("typeInput").value;
        const category = document.getElementById("categoryInput").value;
        const date = document.getElementById("dateInput").value;

        if (!amount || !date) {
            alert("Fill required fields");
            return;
        }

        let debitAccount;
        let creditAccount;

        // 🔹 AUTO MAPPING LOGIC

        if (type === "income") {
            debitAccount = "Cash";
            creditAccount = "Sales";
        }

        if (type === "expense") {

            // If category matches chart of accounts, use it
            if (CHART_OF_ACCOUNTS[category]) {
                debitAccount = category;
            } else {
                debitAccount = "Salary"; // fallback default
            }

            creditAccount = "Cash";
        }

        await addDoc(collection(db, "journalEntries"), {
            uid: currentUser.uid,
            profileId: activeProfileId,
            date,
            debitAccount,
            creditAccount,
            amount,
            createdAt: new Date(),
            source: "transaction"
        });

        await addDoc(collection(db, "transactions"), {
            uid: currentUser.uid,
            profileId: activeProfileId,
            amount,
            type,
            category,
            date,
            createdAt: new Date(),
            source: "business"
        });

        // 🔹 Refresh Everything
        await loadJournal();
        await loadTrialBalance();

        const accountMap = await buildTrialBalanceData();
        const kpis = calculateKPIs(accountMap);
        renderDashboardKPIs(kpis);

        sidePanel.classList.remove("open");
    });
}

    // 🔹 Add Liability
    const addLiabilityBtn = document.getElementById("addLiabilityBtn");
    if (addLiabilityBtn) {
        addLiabilityBtn.addEventListener("click", async () => {

            const type = document.getElementById("liabilityType").value;
            const principal = parseFloat(document.getElementById("principalInput").value);
            const interest = parseFloat(document.getElementById("interestInput").value);
            const monthly = parseFloat(document.getElementById("monthlyPaymentInput").value);

            if (!type || !principal || !monthly) {
                console.log("Missing liability values");
                return;
            }

            await addDoc(collection(db, "liabilities"), {
                uid: currentUser.uid,
                profileId: activeProfileId,
                type,
                principalRemaining: principal,
                interestRate: interest || 0,
                monthlyPayment: monthly,
                createdAt: new Date()
            });

            await loadData();
        });
    }

    // 🔹 Add Asset
    const addAssetBtn = document.getElementById("addAssetBtn");
    if (addAssetBtn) {
        addAssetBtn.addEventListener("click", async () => {

            const type = document.getElementById("assetType").value;
            const value = parseFloat(document.getElementById("assetValue").value);
            const growthRate = parseFloat(document.getElementById("growthRate").value);

            if (!type || !value) {
                console.log("Missing asset values");
                return;
            }

            await addDoc(collection(db, "assets"), {
                uid: currentUser.uid,
                profileId: activeProfileId,
                type,
                currentValue: value,
                growthRate: growthRate || 0,
                createdAt: new Date()
            });

            await loadData();
        });
    }
});

async function loadJournal() {

    const journalList = document.getElementById("journalList");
    if (!journalList) return;

    journalList.innerHTML = "";

    const q = query(
        collection(db, "journalEntries"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const snapshot = await getDocs(q);

    snapshot.forEach(docSnap => {

        const data = docSnap.data();   // ✅ THIS LINE MUST EXIST
        const entryId = docSnap.id;

        // Debit row
        const row1 = document.createElement("tr");
        row1.innerHTML = `
            <td>${data.date}</td>
            <td>${data.debitAccount}</td>
            <td></td>
            <td>${data.amount}</td>
            <td></td>
            <td>
                <button onclick="deleteJournalEntry('${entryId}')"
                    style="background:#ff4d4d;color:white;border:none;padding:4px 8px;">
                    Delete
                </button>
            </td>
        `;
        journalList.appendChild(row1);

        // Credit row
        const row2 = document.createElement("tr");
        row2.innerHTML = `
            <td></td>
            <td style="padding-left:30px;">To ${data.creditAccount}</td>
            <td></td>
            <td></td>
            <td>${data.amount}</td>
            <td></td>
        `;
        journalList.appendChild(row2);

    });
};


// ==========================
// 🔹 LEDGER LOADING
// ==========================

async function loadLedger(accountName) {

    const ledgerBody = document.getElementById("ledgerTableBody");
    if (!ledgerBody) return;

    ledgerBody.innerHTML = "";

    const q = query(
        collection(db, "journalEntries"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const snapshot = await getDocs(q);

    let debitEntries = [];
    let creditEntries = [];

    snapshot.forEach(doc => {
        const data = doc.data();

        if (data.debitAccount === accountName) {
            debitEntries.push({
                date: data.date,
                particulars: data.creditAccount,
                amount: data.amount
            });
        }

        if (data.creditAccount === accountName) {
            creditEntries.push({
                date: data.date,
                particulars: data.debitAccount,
                amount: data.amount
            });
        }
    });

    let totalDebit = debitEntries.reduce((sum, e) => sum + e.amount, 0);
    let totalCredit = creditEntries.reduce((sum, e) => sum + e.amount, 0);

    const maxLength = Math.max(debitEntries.length, creditEntries.length);

    for (let i = 0; i < maxLength; i++) {

        const dr = debitEntries[i];
        const cr = creditEntries[i];

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${dr ? dr.date : ""}</td>
            <td>${dr ? "To " + dr.particulars : ""}</td>
            <td>${dr ? dr.amount : ""}</td>

            <td>${cr ? cr.date : ""}</td>
            <td>${cr ? "By " + cr.particulars : ""}</td>
            <td>${cr ? cr.amount : ""}</td>
        `;

        ledgerBody.appendChild(row);
    }

    // Balance c/d
// ==============================
// 🔹 Ledger Balancing Logic
// ==============================

const balance = totalDebit - totalCredit;

// Get latest transaction date
let latestDate = new Date();

if (debitEntries.length > 0 || creditEntries.length > 0) {
    const allDates = [...debitEntries, ...creditEntries]
        .map(e => new Date(e.date));
    latestDate = new Date(Math.max(...allDates));
}

// Calculate last day of that month
const year = latestDate.getFullYear();
const month = latestDate.getMonth();
const lastDay = new Date(year, month + 1, 0).getDate();
const balanceDate = `${lastDay}-${month + 1}-${year}`;

// BALANCE C/D ROW
const balanceRow = document.createElement("tr");

if (balance > 0) {
    // Debit > Credit → Credit side gets Balance c/d
    balanceRow.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td>${balanceDate}</td>
        <td><strong>By Balance c/d</strong></td>
        <td>${Math.abs(balance)}</td>
    `;
    totalCredit += Math.abs(balance);
}
else if (balance < 0) {
    // Credit > Debit → Debit side gets Balance c/d
    balanceRow.innerHTML = `
        <td>${balanceDate}</td>
        <td><strong>To Balance c/d</strong></td>
        <td>${Math.abs(balance)}</td>
        <td></td>
        <td></td>
        <td></td>
    `;
    totalDebit += Math.abs(balance);
}

ledgerBody.appendChild(balanceRow);

// TOTAL ROW
const totalRow = document.createElement("tr");
totalRow.innerHTML = `
    <td></td>
    <td><strong>Total</strong></td>
    <td><strong>${totalDebit}</strong></td>
    <td></td>
    <td><strong>Total</strong></td>
    <td><strong>${totalCredit}</strong></td>
`;
ledgerBody.appendChild(totalRow);

// BALANCE B/D (Next Period)
const bdRow = document.createElement("tr");

if (balance > 0) {
    bdRow.innerHTML = `
        <td>${balanceDate}</td>
        <td><strong>To Balance b/d</strong></td>
        <td>${Math.abs(balance)}</td>
        <td></td>
        <td></td>
        <td></td>
    `;
}
else if (balance < 0) {
    bdRow.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td>${balanceDate}</td>
        <td><strong>By Balance b/d</strong></td>
        <td>${Math.abs(balance)}</td>
    `;
}

ledgerBody.appendChild(bdRow);
}

// ==========================
// 🔹 TRIAL BALANCE
// ==========================

async function loadTrialBalance() {

    const trialBody = document.getElementById("trialTableBody");
    if (!trialBody) return;

    trialBody.innerHTML = "";

    const q = query(
        collection(db, "journalEntries"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    );

    const snapshot = await getDocs(q);

    let balances = {};

    // Initialize balances
    Object.keys(CHART_OF_ACCOUNTS).forEach(acc => {
        balances[acc] = 0;
    });

    snapshot.forEach(doc => {
        const data = doc.data();

        balances[data.debitAccount] += data.amount;
        balances[data.creditAccount] -= data.amount;
    });

    let totalDebit = 0;
    let totalCredit = 0;

    let serial = 1;

Object.keys(balances).forEach(account => {

    const balance = balances[account];

    if (balance === 0) return;

    const row = document.createElement("tr");

    if (balance > 0) {
        totalDebit += balance;
        row.innerHTML = `
            <td>${serial++}</td>
            <td>${account}</td>
            <td>${balance}</td>
            <td></td>
        `;
    } else {
        totalCredit += Math.abs(balance);
        row.innerHTML = `
            <td>${serial++}</td>
            <td>${account}</td>
            <td></td>
            <td>${Math.abs(balance)}</td>
        `;
    }

    trialBody.appendChild(row);
});

    // Totals
    const totalRow = document.createElement("tr");
totalRow.innerHTML = `
    <td></td>
    <td><strong>Total</strong></td>
    <td><strong>${totalDebit}</strong></td>
    <td><strong>${totalCredit}</strong></td>
`;

    trialBody.appendChild(totalRow);
}

// ==========================
// 🔹 DELETE SINGLE JOURNAL ENTRY
// ==========================

async function deleteJournalEntry(entryId) {

    const confirmDelete = confirm("Delete this journal entry?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "journalEntries", entryId));

    if (document.getElementById("journalList")) {
        await loadJournal();
    }

    if (document.getElementById("trialTableBody")) {
        await loadTrialBalance();
    }

    // 🔹 Recalculate KPIs everywhere
    const accountMap = await buildTrialBalanceData();
    const kpis = calculateKPIs(accountMap);
    renderDashboardKPIs(kpis);
}

window.deleteJournalEntry = deleteJournalEntry;
