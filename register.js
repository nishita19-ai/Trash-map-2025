// register.js

import { auth, db } from "./firebaseconfig.js";  
import { createUserWithEmailAndPassword, updateProfile } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const registerForm = document.getElementById("registerForm");
const verificationMsg = document.getElementById("verifyMsg");
const userRadios = document.querySelectorAll('input[name="userType"]');
const messageBox = document.createElement("div"); 
messageBox.className = "form-message";
registerForm.appendChild(messageBox);

// Helper for messages
function showMessage(msg, type = "info") {
  messageBox.innerText = msg;
  messageBox.className = `form-message ${type} fade-in`;
}

// Show preloader & redirect (same as login.js)
function showPreloaderAndRedirect(target) {
  let preloader = document.getElementById("ct-preloader");

  if (!preloader) {
    preloader = document.createElement("div");
    preloader.id = "ct-preloader";
    preloader.innerHTML = `
      <div class="logo-mark">
        <video autoplay muted loop playsinline class="logo-video">
          <source src="assets/CleanTrackLogoAnimation.mp4" type="video/mp4" />
        </video>
      </div>`;
    document.body.appendChild(preloader);
  } else {
    preloader.style.display = "flex";
    preloader.classList.remove("fade-out");
  }

  setTimeout(() => {
    window.location.href = target;
  }, 1200);
}

// Show verification message when Admin is selected
userRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (document.getElementById("adminRadio").checked) {
      verificationMsg.style.display = "block";
      verificationMsg.innerText = "Admin accounts will be activated only after verification.";
      verificationMsg.className = "form-message error fade-in";
    } else {
      verificationMsg.style.display = "none";
      verificationMsg.innerText = "";
      verificationMsg.className = "form-message";
    }
  });
});

// Handle Registration
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const userType = document.querySelector('input[name="userType"]:checked').value;

  try {
    // 1. Create account in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const uid = user.uid;

    // 2. Update Firebase Auth profile
    await updateProfile(user, {
      displayName: `${name} (${username})`
    });

    // 3. Save user data in Firestore
    await setDoc(doc(db, "users", uid), {
      name: name,
      username: username,
      email: email,
      userType: userType,
      verified: userType === "admin" ? false : true, // Admin requires verification
      createdAt: serverTimestamp()
    });

    // 4. Success message + redirect
    if (userType === "admin") {
      showMessage("Admin account created! It will be activated after verification.", "success");
      setTimeout(() => {
        showPreloaderAndRedirect("login.html");
      }, 2000);
    } else {
      showMessage(`Account created successfully as ${userType}! Redirecting...`, "success");
      setTimeout(() => {
        showPreloaderAndRedirect("login.html");
      }, 2000);
    }

    console.log("User created with UID:", uid);

  } catch (error) {
    console.error("Error:", error.message);
    showMessage(`⚠️ ${error.message}`, "error");
  }
});