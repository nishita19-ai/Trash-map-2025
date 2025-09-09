// login.js
import { auth, db } from "./firebaseconfig.js";
import { 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginForm = document.querySelector("form");
const messageBox = document.createElement("div");
messageBox.className = "form-message";
loginForm.appendChild(messageBox);

// Helper function for messages
function showMessage(msg, type = "info") {
  messageBox.innerText = msg;
  messageBox.className = `form-message ${type} fade-in`;
}

// Preloader + redirect
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

// Handle login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  try {
    // Lookup user by email
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      showMessage("User not found", "error");
      return;
    }

    let userType, verified;
    snapshot.forEach((doc) => {
      const data = doc.data();
      userType = data.userType;
      verified = data.verified;
    });

    // Enforce session persistence
    await setPersistence(auth, browserLocalPersistence);

    // Firebase login
    await signInWithEmailAndPassword(auth, email, password);

    // Redirect rules
    if (userType === "citizen") {
      showPreloaderAndRedirect("citizendashboard.html");
    } else if (userType === "admin") {
      if (verified) {
        showPreloaderAndRedirect("admindashboard.html");
      } else {
        showMessage("⚠️ Your admin account is not verified yet.", "error");
      }
    } else {
      showMessage("Unknown user type", "error");
    }

  } catch (error) {
    console.error("Login error:", error.message);
    showMessage(error.message, "error");
  }
});

// Register button redirect
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", () => {
    showPreloaderAndRedirect("register.html");
  });
}
// End of login.js