// COMPLETE ADVANCED ENGINE — FIXED VERSION

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAuth, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
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

const activeProfileId = localStorage.getItem("activeProfileId");
let mcChartInstance = null;

onAuthStateChanged(auth, async (user) => {
    const logoutBtnHeader = document.getElementById("logoutBtnHeader");

if (logoutBtnHeader) {
    logoutBtnHeader.onclick = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };
}

    if (!user) return;

    const txSnap = await getDocs(query(
        collection(db, "transactions"),
        where("uid", "==", user.uid),
        where("profileId", "==", activeProfileId)
    ));

    const liabilitySnap = await getDocs(query(
        collection(db, "liabilities"),
        where("uid", "==", user.uid),
        where("profileId", "==", activeProfileId)
    ));

    const assetSnap = await getDocs(query(
        collection(db, "assets"),
        where("uid", "==", user.uid),
        where("profileId", "==", activeProfileId)
    ));

    let income = 0;
let expense = 0;
let cash = 0;
let totalDebt = 0;
let monthlyDebt = 0;
let totalAssets = 0;
let monthlyExpenseMap = {};

    

txSnap.forEach(doc => {
    const d = doc.data();

    if (d.type === "income") {
        income += Number(d.amount);
        cash += Number(d.amount);
    }

    


if (d.type === "expense") {

    const month = d.date.substring(0,7); // YYYY-MM

    if (!monthlyExpenseMap[month]) {
        monthlyExpenseMap[month] = 0;
    }

    monthlyExpenseMap[month] += Number(d.amount);

    expense += Number(d.amount);
    cash -= Number(d.amount);
}});
    liabilitySnap.forEach(doc => {
        const l = doc.data();
        totalDebt += Number(l.principalRemaining);
        monthlyDebt += Number(l.monthlyPayment);
    });

    assetSnap.forEach(doc => {
        totalAssets += Number(doc.data().currentValue);
    });

   runAdvancedModel(
    income,
    expense,
    cash,
    totalDebt,
    monthlyDebt,
    totalAssets,
    monthlyExpenseMap
);
});


function runAdvancedModel(
    income,
    expense,
    cash,
    totalDebt,
    monthlyDebt,
    totalAssets,
    monthlyExpenseMap
){
// ==========================
// TAX ADJUSTMENT
// ==========================
function calculateIndianIncomeTax(annualIncome) {

    let tax = 0;

    if (annualIncome <= 300000) {
        tax = 0;
    }
    else if (annualIncome <= 600000) {
        tax = (annualIncome - 300000) * 0.05;
    }
    else if (annualIncome <= 900000) {
        tax = (300000 * 0.05) +
              (annualIncome - 600000) * 0.10;
    }
    else if (annualIncome <= 1200000) {
        tax = (300000 * 0.05) +
              (300000 * 0.10) +
              (annualIncome - 900000) * 0.15;
    }
    else {
        tax = annualIncome * 0.20;
    }

    return tax;
}

const taxAmount = calculateIndianIncomeTax(income);
const afterTaxIncome = income - taxAmount;
const taxRateEffective = income > 0 ? taxAmount / income : 0;

const annualSavings = afterTaxIncome - expense;
// ==========================
// 🔹 CORE ADVANCED METRICS
// ==========================

// Monthly conversion
const monthlyIncome = afterTaxIncome / 12;
// Rolling 6-month average expense

const months = Object.keys(monthlyExpenseMap)
    .sort()
    .reverse()
    .slice(0,6);

let rollingExpense = 0;

months.forEach(m => {
    rollingExpense += monthlyExpenseMap[m];
});

const monthlyExpense =
    months.length > 0
    ? rollingExpense / months.length
    : 0;


// Savings rate
const savingsRate = income > 0
    ? annualSavings / income
    : 0;

// Debt-to-Income (monthly)
const dti = monthlyIncome > 0
    ? monthlyDebt / monthlyIncome
    : 0;

// Debt-to-Asset
const debtAsset = totalAssets > 0
    ? totalDebt / totalAssets
    : 0;

// Emergency Coverage (CASH-BASED)


let emergencyCoverage = 0;

if (monthlyExpense > 0) {
    emergencyCoverage = cash / monthlyExpense;
}
// Net Worth
const netWorth = totalAssets - totalDebt;

// Liquidity Ratio
const liquidityRatio =
    totalDebt > 0
    ? cash / totalDebt
    : 0;

// Solvency Ratio
const solvencyRatio =
    totalAssets > 0
    ? netWorth / totalAssets
    : 0;

// Leverage Ratio
const leverageRatio =
    netWorth !== 0
    ? totalDebt / Math.abs(netWorth)
    : 0;

// Burn Rate (Monthly Net Cash Flow)
const burnRate = monthlyIncome - monthlyExpense;


// ==========================
// 🔹 NORMALIZATION (0–100)
// ==========================

function clamp(x) {
    return Math.max(0, Math.min(100, x));
}

const savingsScore = clamp(savingsRate * 100);
const dtiScore = clamp(100 - (dti * 120));
const emergencyScore = clamp(emergencyCoverage * 15);
const debtAssetScore = clamp(100 - (debtAsset * 100));
const liquidityScore = clamp(liquidityRatio * 100);
const solvencyScore = clamp(solvencyRatio * 100);


// ==========================
// 🔹 FINANCIAL RESILIENCE INDEX
// ==========================

const fri =
    (0.20 * savingsScore) +
    (0.20 * dtiScore) +
    (0.15 * emergencyScore) +
    (0.15 * debtAssetScore) +
    (0.15 * liquidityScore) +
    (0.15 * solvencyScore);

// Financial Independence Score
const fis =
    (0.4 * savingsScore) +
    (0.3 * solvencyScore) +
    (0.3 * liquidityScore);

initializeStressEngine(income, expense, cash, totalDebt, monthlyDebt, totalAssets, fri);
// ==========================
// 🔹 UPDATE UI
// ==========================

set("savingsRate", (savingsRate * 100).toFixed(1) + "%");
set("dtiValue", (dti * 100).toFixed(1) + "%");
set("emergencyCoverage", emergencyCoverage.toFixed(1) + " months");
set("debtAssetValue", (debtAsset * 100).toFixed(1) + "%");
set("friValue", fri.toFixed(0));
set("fisValue", fis.toFixed(0));

set("netWorthValue", "₹ " + netWorth.toFixed(0));
set("liquidityRatio", liquidityRatio.toFixed(2));
set("solvencyRatio", (solvencyRatio * 100).toFixed(1) + "%");
set("leverageRatio", leverageRatio.toFixed(2));
set("burnRate", "₹ " + burnRate.toFixed(0));
set("effectiveTax", (taxRateEffective * 100).toFixed(1) + "%");
set("afterTaxIncomeValue", "₹ " + afterTaxIncome.toFixed(0));
runMonteCarlo(afterTaxIncome, expense, cash, totalDebt, totalAssets);}




function set(id,val){
    const el = document.getElementById(id);
    if(el) el.innerText = val;
}

// ==========================
// 🔹 STRESS ENGINE
// ==========================

let baseData = null;

function initializeStressEngine(income, expense, cash, totalDebt, monthlyDebt, totalAssets, fri) {

    baseData = {
        income,
        expense,
        cash,
        totalDebt,
        monthlyDebt,
        totalAssets,
        fri
    };

    const incomeSlider = document.getElementById("incomeShockSlider");
    const expenseSlider = document.getElementById("expenseShockSlider");

    if (!incomeSlider || !expenseSlider) return;

    function runStress() {

        const incomeShock = Number(incomeSlider.value) / 100;
        const expenseShock = Number(expenseSlider.value) / 100;

        // Update labels visually
        incomeSlider.previousElementSibling.innerText =
            "Income Shock % (" + (incomeShock * 100).toFixed(0) + "%)";

        expenseSlider.previousElementSibling.innerText =
            "Expense Shock % (" + (expenseShock * 100).toFixed(0) + "%)";

        const stressedIncome = baseData.income * (1 - incomeShock);
        const stressedExpense = baseData.expense * (1 + expenseShock);

        const stressedMonthlyIncome = stressedIncome / 12;
        const stressedMonthlyExpense = stressedExpense / 12;

        const stressedSavings = stressedIncome - stressedExpense;

        const stressedSavingsRate =
            stressedIncome > 0
            ? stressedSavings / stressedIncome
            : 0;
const incomeShockPenalty = 100 * (1 - Math.exp(-3 * incomeShock));
const expenseShockPenalty = 80 * (1 - Math.exp(-3 * expenseShock));
        const stressedDTI =
            stressedMonthlyIncome > 0
            ? baseData.monthlyDebt / stressedMonthlyIncome
            : 0;

        const stressedEmergency =
            stressedMonthlyExpense > 0
            ? baseData.cash / stressedMonthlyExpense
            : 0;

        const stressedDebtAsset =
            baseData.totalAssets > 0
            ? baseData.totalDebt / baseData.totalAssets
            : 0;

        const stressedLiquidity =
            baseData.totalDebt > 0
            ? baseData.cash / baseData.totalDebt
            : 0;

        const stressedSolvency =
            baseData.totalAssets > 0
            ? (baseData.totalAssets - baseData.totalDebt) / baseData.totalAssets
            : 0;

        function clamp(x){
            return Math.max(0, Math.min(100, x));
        }

        const s1 = clamp(stressedSavingsRate * 100);
        const s2 = clamp(100 - (stressedDTI * 180));
        const s3 = clamp(Math.log(1 + stressedEmergency) * 25);
        const s4 = clamp(100 - (stressedDebtAsset * 100));
        const s5 = clamp(stressedLiquidity * 100);
        const s6 = clamp(stressedSolvency * 100);

     let stressedFRI =
    (0.25 * s1) +
    (0.25 * s2) +
    (0.15 * s3) +
    (0.10 * s4) +
    (0.10 * s5) +
    (0.10 * s6);

// Smooth multiplicative shock decay
const shockImpact =
    Math.exp(-2 * incomeShock) *
    Math.exp(-1.5 * expenseShock);

stressedFRI = stressedFRI * shockImpact;

// Never allow negative
stressedFRI = Math.max(0, stressedFRI);

        const shockRetention =
            baseData.fri > 0
            ? stressedFRI / baseData.fri
            : 0;

        set("stressFriValue", stressedFRI.toFixed(0));
        set("shockRetentionValue", (shockRetention * 100).toFixed(1) + "%");

        set("stressedIncome", "₹ " + (stressedMonthlyIncome.toFixed(0)));
set("stressedExpense", "₹ " + (stressedMonthlyExpense.toFixed(0)));

const survivableMonths =
    stressedMonthlyExpense > 0
    ? baseData.cash / stressedMonthlyExpense
    : 0;

set("stressedSurvival", survivableMonths.toFixed(1) + " months");
    }

    incomeSlider.addEventListener("input", runStress);
    expenseSlider.addEventListener("input", runStress);
}

// ==========================
// 🔹 MONTE CARLO ENGINE
// ==========================

async function runMonteCarlo(income, expense, cash, totalDebt, totalAssets) {

    const simulations = 1000;
    const years = 10;

    const incomeDrift = 0.04;
    const expenseDrift = 0.04;

    const incomeVol = 0.20;
    const expenseVol = 0.15;

    let growthCount = 0;
    let insolvencyCount = 0;
    let declineCount = 0;

    let finalNetWorths = [];
const stockSnap = await getDocs(query(
    collection(db, "stocks"),
    where("uid", "==", auth.currentUser.uid),
    where("profileId", "==", activeProfileId)
));

let totalStockValue = 0;

stockSnap.forEach(docSnap => {
    const s = docSnap.data();
    totalStockValue += Number(s.quantity) * Number(s.currentPrice);
});
    const startingNetWorth = cash + totalAssets - totalDebt;

    for (let i = 0; i < simulations; i++) {

        let simIncome = income;
        let simExpense = expense;
        let simAssets = totalAssets;
        let simDebt = totalDebt;
        let simCash = cash;

        let bankrupt = false;

        for (let t = 0; t < years; t++) {

           // 10% probability of unemployment shock
if (Math.random() < 0.10) {
    simIncome *= 0.3; // 70% income collapse
} else {
    // Persistent unemployment regime
if (Math.random() < 0.08) {
    // 8% chance of multi-year income collapse
    simIncome *= 0.25;  // 75% income drop
} else {
    simIncome *= Math.exp(
        (incomeDrift - 0.5 * incomeVol * incomeVol) +
        incomeVol * gaussianRandom()
    );
}
}

          simExpense *= Math.exp(
    (expenseDrift - 0.5 * expenseVol * expenseVol) +
    expenseVol * gaussianRandom()
);

// expenses rarely fall
if (simExpense < expense * 0.9) {
    simExpense = expense * 0.9;
}

// expenses do not fall easily
if (simExpense < expense) {
    simExpense = expense;
}

            const yearlySavings = simIncome - simExpense;

            simCash += yearlySavings;

            

            let weightedReturn = 0;
            let weightedVariance = 0;

if (totalAssets > 0 && totalStockValue > 0) {

    stockSnap.forEach(docSnap => {
        const s = docSnap.data();
        const stockValue = Number(s.quantity) * Number(s.currentPrice);
        const stockWeight = stockValue / totalAssets;
        const stockReturn = Number(s.expectedReturn) || 0.08;
        const stockVol = Number(s.volatility) || 0.2;
        weightedReturn += stockWeight * stockReturn;
        weightedVariance += Math.pow(stockWeight * stockVol, 2);
    });

} else {
    weightedReturn = 0.06;
    weightedVariance = Math.pow(0.15, 2);
}

            const weightedVol = Math.sqrt(weightedVariance);
            const assetReturn = Math.exp(
                (weightedReturn - 0.5 * weightedVol * weightedVol) +
                weightedVol * gaussianRandom()
            ) - 1;

            simAssets = Math.max(0, simAssets * (1 + assetReturn));

            if (simCash < 0 && Math.abs(simCash) > Math.max(simAssets * 0.25, simIncome)) {
                bankrupt = true;
                break;
            }
        }

        const netWorth = simAssets + simCash - simDebt;

        finalNetWorths.push(netWorth);

        if (bankrupt) {
            insolvencyCount++;
        }
        else if (netWorth > startingNetWorth) {
            growthCount++;
        }
        else {
            declineCount++;
        }
    }
    if (finalNetWorths.length > 0) {

    finalNetWorths.sort((a, b) => a - b);

    const median =
        finalNetWorths[Math.floor(finalNetWorths.length * 0.5)];

    const worst =
        finalNetWorths[Math.floor(finalNetWorths.length * 0.05)];

    const best =
        finalNetWorths[Math.floor(finalNetWorths.length * 0.95)];

    set("mcMedian", "₹ " + median.toFixed(0));
    set("mcWorst", "₹ " + worst.toFixed(0));
    set("mcBest", "₹ " + best.toFixed(0));
}

    const growthProbability = (growthCount / simulations) * 100;
    const insolvencyProbability = (insolvencyCount / simulations) * 100;
    const declineProbability = (declineCount / simulations) * 100;
    set("mcDecline", declineProbability.toFixed(1) + "%");

    set("mcProbability", growthProbability.toFixed(1) + "%");
    set("insolvencyProbability", insolvencyProbability.toFixed(1) + "%");

    renderMonteCarloChart(finalNetWorths);
}

// ==========================
// 🔹 Gaussian Random Generator
// ==========================

function gaussianRandom() {
    let u = 0, v = 0;

    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    return Math.sqrt(-2.0 * Math.log(u)) *
           Math.cos(2.0 * Math.PI * v);
}

// ==========================
// 🔹 Chart Renderer
// ==========================



function renderMonteCarloChart(data) {

    if (!data || data.length === 0) return;

    const canvas = document.getElementById("mcChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const bins = 30;

    const sorted = [...data].sort((a, b) => a - b);

    const min = Math.min(...sorted);
    const max = Math.max(...sorted);

    const step = (max - min) / bins;

    const histogram = new Array(bins).fill(0);

    sorted.forEach(value => {
        let index = Math.floor((value - min) / step);
        if (index >= bins) index = bins - 1;
        histogram[index]++;
    });

    const labels = histogram.map((_, i) =>
        Math.round(min + i * step)
    );

    if (mcChartInstance) {
        mcChartInstance.destroy();
    }

    mcChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: "Net Worth Distribution",
                data: histogram
            }]
        },
        options: {
            responsive: true
        }
    });
}
