import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function loadFinancialCore(db, user, activeProfileId) {

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
const stockSnap = await getDocs(query(
    collection(db, "stocks"),
    where("uid", "==", user.uid),
    where("profileId", "==", activeProfileId)
));
    let income = 0;
    let expense = 0;
    let totalDebt = 0;
let monthlyDebt = 0;
    let totalAssets = 0;

    txSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === "income") income += Number(d.amount);
        if (d.type === "expense") expense += Number(d.amount);
    });

  liabilitySnap.forEach(doc => {
    const l = doc.data();
    totalDebt += Number(l.principalRemaining);
    monthlyDebt += Number(l.monthlyPayment || 0);
});

    assetSnap.forEach(doc => {
        totalAssets += Number(doc.data().currentValue);
    });
let dividendIncome = 0;

stockSnap.forEach(docSnap => {
    const s = docSnap.data();
    const value = Number(s.quantity) * Number(s.currentPrice);
    dividendIncome += value * (s.dividendYield || 0);
});

income += dividendIncome;
    const taxDoc = await getDoc(doc(db, "taxSettings", activeProfileId));

    let taxRate = 0;
    if (taxDoc.exists()) {
        taxRate = taxDoc.data().taxRate / 100;
    }

    const afterTaxIncome = income * (1 - taxRate);
    const disposableIncome = afterTaxIncome - expense;
    const netWorth = totalAssets - totalDebt;

    return {
    income,
    expense,
    taxRate,
    afterTaxIncome,
    disposableIncome,
    totalDebt,
    monthlyDebt,
    totalAssets,
    netWorth
};
}