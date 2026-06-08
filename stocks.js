 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
 import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
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

const activeProfileId = localStorage.getItem("activeProfileId");
let currentUser = null;


    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("logoutBtnHeader").onclick = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };

document.getElementById("addStockBtn").onclick = async () => {

    const ticker = document.getElementById("tickerInput").value.toUpperCase();
    const exchange = document.getElementById("exchangeInput").value;
    const quantity = Number(document.getElementById("quantityInput").value);
    const purchasePrice = Number(document.getElementById("purchasePriceInput").value);

    if (!ticker || !quantity || !purchasePrice) {
        alert("Fill all required fields.");
        return;
    }

    try {

        const quote = await fetchLiveStockPrice(ticker, exchange);
        const currentPrice = quote.price;
        const { annualReturn, annualVol } = marketAssumptions(exchange);

        await addDoc(collection(db, "stocks"), {
            uid: currentUser.uid,
            profileId: activeProfileId,
            ticker,
            exchange,
            quantity,
            purchasePrice,
            currentPrice,
            lastPriceSource: quote.source,
            lastPriceUpdate: new Date(),
            volatility: annualVol,
            expectedReturn: annualReturn,
            dividendYield: 0,
            createdAt: new Date()
        });

        alert("Stock added.");
        loadStocks();

    } catch (error) {
        console.error(error);
        alert(error.message || "Error fetching stock data.");
    }
};

const refreshBtn = document.getElementById("refreshStocksBtn");
if (refreshBtn) {
    refreshBtn.onclick = refreshMarketPrices;
}

await loadStocks();
});

function marketAssumptions(exchange) {
    if (exchange === "US") return { annualReturn: 0.09, annualVol: 0.20 };
    if (exchange === "NSE" || exchange === "BSE") return { annualReturn: 0.11, annualVol: 0.24 };
    return { annualReturn: 0.08, annualVol: 0.18 };
}

async function fetchLiveStockPrice(ticker, exchange) {
    const backendUrl = `http://localhost:3000/stock?ticker=${encodeURIComponent(ticker)}&exchange=${encodeURIComponent(exchange)}`;
    const response = await fetch(backendUrl);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !Number.isFinite(Number(data.price))) {
        throw new Error(data.error || "Live price unavailable. Start the stock backend on http://localhost:3000 and try again.");
    }

    return {
        price: Number(data.price),
        source: "live-backend"
    };
}

async function loadStocks() {

    const snap = await getDocs(query(
        collection(db, "stocks"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    ));

    const list = document.getElementById("stockList");
    list.innerHTML = "";

    snap.forEach(doc => {

        const s = doc.data();
        const value = s.quantity * s.currentPrice;
        const gain = ((s.currentPrice - s.purchasePrice) / s.purchasePrice) * 100;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${s.ticker}</td>
            <td>${Number(s.quantity).toFixed(2)}</td>
            <td>₹ ${value.toFixed(0)}</td>
            <td>${gain.toFixed(2)}%</td>
        `;

        list.appendChild(row);
    });
}

async function refreshMarketPrices() {
    const snap = await getDocs(query(
        collection(db, "stocks"),
        where("uid", "==", currentUser.uid),
        where("profileId", "==", activeProfileId)
    ));

    

    for (const docSnap of snap.docs) {

        const s = docSnap.data();
        try {
if (!s.exchange) {
    console.log("Missing exchange for:", s.ticker);
    continue;
}

const quote = await fetchLiveStockPrice(s.ticker, s.exchange);
const newPrice = quote.price;



    

    console.log("Old Price:", s.currentPrice);
    console.log("New Price:", newPrice);

    await updateDoc(
        doc(db, "stocks", docSnap.id),
        { currentPrice: newPrice, lastPriceSource: quote.source, lastPriceUpdate: new Date() }
    );

} catch (err) {
    console.error("Error updating:", s.ticker);
}
}

  
    

    alert("Market prices updated.");
    loadStocks();
}
