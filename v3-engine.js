import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { loadFinancialCore } from "./core-finance.js";
import { getAuth, onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore
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
let v3ChartInstance = null;
let v3State = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const logoutBtn = document.getElementById("logoutBtnHeader");
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.href = "index.html";
        };
    }

    await initializeV3(user);
});

async function initializeV3(user) {
    const data = await loadFinancialCore(db, user, activeProfileId);

    v3State = {
        income: data.income,
        expense: data.expense,
        taxRate: data.taxRate,
        afterTaxIncome: data.afterTaxIncome,
        disposableIncome: data.disposableIncome,
        netWorth: data.netWorth,
        totalAssets: data.totalAssets,
        totalDebt: data.totalDebt
    };

    const capitalOverview = document.getElementById("capitalOverview");
    if (capitalOverview) {
        capitalOverview.innerHTML = `
            <div class="statement-line"><span>Income</span><strong>₹ ${formatNumber(v3State.income)}</strong></div>
            <div class="statement-line"><span>Effective Tax</span><strong>${(v3State.taxRate * 100).toFixed(1)}%</strong></div>
            <div class="statement-line"><span>After-Tax Income</span><strong>₹ ${formatNumber(v3State.afterTaxIncome)}</strong></div>
            <div class="statement-line"><span>Disposable Income</span><strong>₹ ${formatNumber(v3State.disposableIncome)}</strong></div>
            <div class="statement-line"><span>Net Worth</span><strong>₹ ${formatNumber(v3State.netWorth)}</strong></div>
        `;
    }

    const calculateBtn = document.getElementById("calculatePortfolioBtn");
    if (calculateBtn) {
        calculateBtn.onclick = runPortfolioAndSimulation;
    }

    runPortfolioAndSimulation();
}

function runPortfolioAndSimulation() {
    if (!v3State) return;

    const portfolio = calculatePortfolio();
    if (!portfolio) return;

    setText("portfolioReturn", (portfolio.expectedReturn * 100).toFixed(2) + "%");
    setText("portfolioVol", (portfolio.volatility * 100).toFixed(2) + "%");
    setText("portfolioSharpe", portfolio.sharpe.toFixed(2));

    const result = runV3MonteCarlo(portfolio, v3State);

    setText("v3Growth", result.growthProbability.toFixed(1) + "%");
    setText("v3Decline", result.declineProbability.toFixed(1) + "%");
    setText("v3Insolvency", result.insolvencyProbability.toFixed(1) + "%");

    renderV3Chart(result.finalWealths);
}

function calculatePortfolio() {
    const weights = {
        equity: readWeight("equityWeight"),
        bond: readWeight("bondWeight"),
        realEstate: readWeight("realEstateWeight"),
        cash: readWeight("cashWeight")
    };

    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);

    if (Math.abs(totalWeight - 1) > 0.01) {
        alert("Weights must sum to 100%");
        return null;
    }

    const assumptions = {
        equity: { expectedReturn: 0.12, volatility: 0.25 },
        bond: { expectedReturn: 0.06, volatility: 0.10 },
        realEstate: { expectedReturn: 0.08, volatility: 0.15 },
        cash: { expectedReturn: 0.03, volatility: 0.01 }
    };

    const expectedReturn =
        weights.equity * assumptions.equity.expectedReturn +
        weights.bond * assumptions.bond.expectedReturn +
        weights.realEstate * assumptions.realEstate.expectedReturn +
        weights.cash * assumptions.cash.expectedReturn;

    const variance =
        Math.pow(weights.equity * assumptions.equity.volatility, 2) +
        Math.pow(weights.bond * assumptions.bond.volatility, 2) +
        Math.pow(weights.realEstate * assumptions.realEstate.volatility, 2) +
        Math.pow(weights.cash * assumptions.cash.volatility, 2);

    const volatility = Math.sqrt(variance);
    const riskFreeRate = 0.03;

    return {
        expectedReturn,
        volatility,
        sharpe: volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0
    };
}

function runV3MonteCarlo(portfolio, state) {
    const simulations = 1000;
    const years = 10;
    const initialWealth = Math.max(0, state.netWorth + Math.max(0, state.disposableIncome));
    const annualContribution = state.disposableIncome;

    let growth = 0;
    let decline = 0;
    let insolvency = 0;
    const finalWealths = [];

    for (let i = 0; i < simulations; i++) {
        let wealth = initialWealth;
        let insolvent = false;

        for (let year = 0; year < years; year++) {
            const annualReturn = Math.exp(
                (portfolio.expectedReturn - 0.5 * portfolio.volatility * portfolio.volatility) +
                portfolio.volatility * gaussianRandom()
            ) - 1;

            wealth = wealth * (1 + annualReturn) + annualContribution;

            if (wealth < 0) {
                insolvent = true;
                break;
            }
        }

        finalWealths.push(wealth);

        if (insolvent) insolvency++;
        else if (wealth > initialWealth) growth++;
        else decline++;
    }

    return {
        finalWealths,
        growthProbability: (growth / simulations) * 100,
        declineProbability: (decline / simulations) * 100,
        insolvencyProbability: (insolvency / simulations) * 100
    };
}

function renderV3Chart(values) {
    const canvas = document.getElementById("v3Chart");
    if (!canvas || !values.length) return;

    const sorted = [...values].sort((a, b) => a - b);
    const bins = 25;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const step = max === min ? 1 : (max - min) / bins;
    const histogram = new Array(bins).fill(0);

    sorted.forEach((value) => {
        const index = Math.min(bins - 1, Math.floor((value - min) / step));
        histogram[index]++;
    });

    if (v3ChartInstance) {
        v3ChartInstance.destroy();
    }

    v3ChartInstance = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: {
            labels: histogram.map((_, index) => formatNumber(min + index * step)),
            datasets: [{
                label: "10-Year Wealth Distribution",
                data: histogram,
                backgroundColor: "#111111"
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { maxRotation: 0, autoSkip: true } },
                y: { beginAtZero: true }
            }
        }
    });
}

function readWeight(id) {
    return Number(document.getElementById(id)?.value || 0) / 100;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.innerText = value;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
}

function gaussianRandom() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
