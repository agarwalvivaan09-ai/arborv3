

// Import Firebase modules
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// Your Firebase config (PASTE YOUR OWN FROM FIREBASE)
const firebaseConfig = {
  apiKey: "AIzaSyD-aNwo7FYCvoUuk39-Zhh7PlY5GXn_7QI",
  authDomain: "arbor-2f198.firebaseapp.com",
  projectId: "arbor-2f198",
  storageBucket: "arbor-2f198.firebasestorage.app",
  messagingSenderId: "737678584809",
  appId: "1:737678584809:web:e62efd7418b65396283978"
};


window.addEventListener("DOMContentLoaded", () => {

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("message");

    // SIGN UP
    document.getElementById("signupBtn")
    .addEventListener("click", () => {

        const email = emailInput.value;
        const password = passwordInput.value;

        createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            window.location.href = "profiles.html";
        })
        .catch((error) => {

            let msg = "Something went wrong.";

            if (error.code === "auth/email-already-in-use") {
                msg = "Email already in use.";
            }
            else if (error.code === "auth/invalid-email") {
                msg = "Invalid email address.";
            }
            else if (error.code === "auth/weak-password") {
                msg = "Password must be at least 6 characters.";
            }

            message.innerText = msg;
        });
    });

    // LOGIN
    document.getElementById("loginBtn")
    .addEventListener("click", () => {

        const email = emailInput.value;
        const password = passwordInput.value;

        signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            window.location.href = "profiles.html";
        })
        .catch((error) => {

            let msg = "Login failed.";

            if (error.code === "auth/user-not-found") {
                msg = "No account found with this email.";
            }
            else if (error.code === "auth/wrong-password") {
                msg = "Incorrect password.";
            }

            message.innerText = msg;
        });
    });

    // PASSWORD RESET
    document.getElementById("forgotPassword")
    .addEventListener("click", () => {

        const email = emailInput.value;

        if (!email) {
            message.innerText = "Enter your email to reset password.";
            return;
        }

        sendPasswordResetEmail(auth, email)
        .then(() => {
            message.innerText = "Password reset email sent.";
        })
        .catch(() => {
            message.innerText = "Unable to send reset email.";
        });
    });

});