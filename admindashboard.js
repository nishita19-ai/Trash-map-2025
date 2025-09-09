// admindashboard.js
// citizendashboard.js — CleanTrack Citizen Dashboard logic
import { auth, db } from "./firebaseconfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, onSnapshot, query, where, getDocs, setDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Helpers
function $(id) { return document.getElementById(id); }
// =============== Utility Functions ===============

// Set current year in footer
document.addEventListener("DOMContentLoaded", () => {
  const yearNow = document.getElementById("yearNow");
  if (yearNow) yearNow.textContent = new Date().getFullYear();
});

// Smooth scroll for "Back to top"
document.querySelectorAll("[data-scroll]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
// ========== AUTH GUARD ==========
let currentUser = null;
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setTimeout(() => {
      if (!auth.currentUser) {
        window.location.href = "login.html";
      }
    }, 500);
    return;
  }

  if (currentUser && currentUser.uid === user.uid) return;

  currentUser = user;
  $("userWelcome").textContent = user.email.split("@")[0];
  await loadReports(user.uid);
});

// =============== KPI Animations ===============
function animateKPI(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  let count = 0;
  const step = Math.ceil(target / 60); // animate ~1s at 60fps
  const interval = setInterval(() => {
    count += step;
    if (count >= target) {
      el.textContent = target + suffix;
      clearInterval(interval);
    } else {
      el.textContent = count + suffix;
    }
  }, 16);
}

// Example KPI animation
animateKPI("kpiTotalBins", 256);
animateKPI("kpiComplaints", 43);
animateKPI("kpiWorkers", 18);
animateKPI("kpiResolved", 87, "%");

// =============== Charts ===============
function initCharts() {
  const complaintCtx = document.getElementById("complaintChart");
  if (complaintCtx) {
    new Chart(complaintCtx, {
      type: "bar",
      data: {
        labels: ["Pending", "Resolved"],
        datasets: [{
          data: [12, 31],
          backgroundColor: ["#ef4444", "#10b981"]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  const binCtx = document.getElementById("binChart");
  if (binCtx) {
    new Chart(binCtx, {
      type: "doughnut",
      data: {
        labels: ["Full", "Normal", "Empty"],
        datasets: [{
          data: [5, 18, 10],
          backgroundColor: ["#f59e0b", "#22d3ee", "#8bc34a"]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }
}
initCharts();

// =============== Map ===============
document.addEventListener("DOMContentLoaded", () => {
  // Shortcut
  const $ = (id) => document.getElementById(id);

  // Initialize map
  const routeMap = L.map("route-map").setView([28.4595, 77.0266], 12);

  // OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(routeMap);

  // Custom icons
  const createIcon = (iconHtml, cls = "") =>
    L.divIcon({
      html: `<i class="bi ${iconHtml} ${cls}" style="font-size: 1.5rem;"></i>`,
      className: "",
      iconSize: [30, 30],
      popupAnchor: [0, -10]
    });

  const binIcon = createIcon("bi-trash2-fill", "text-red-500");
  const plantIcon = createIcon("bi-recycle", "text-green-400");
  const reportIcon = createIcon("bi-exclamation-triangle-fill", "text-yellow-400");

  // Marker storage
  const markers = { bins: [], plants: [], reports: [] };

  // Clear markers of a type
  const clearMarkers = (type) => {
    markers[type].forEach(m => routeMap.removeLayer(m));
    markers[type] = [];
  };

  // Update visible layers based on checkboxes
  const updateLayers = () => {
    ["bins", "plants", "reports"].forEach(type => {
      markers[type].forEach(m => routeMap.removeLayer(m)); // remove all first
    });

    if ($("layerBins")?.checked) markers.bins.forEach(m => m.addTo(routeMap));
    if ($("layerPlants")?.checked) markers.plants.forEach(m => m.addTo(routeMap));
    if ($("layerComplaints")?.checked) markers.reports.forEach(m => m.addTo(routeMap));
  };

  // Firestore collections
  const binsRef = collection(db, "bins");
  const plantsRef = collection(db, "plants");
  const reportsRef = collection(db, "reports");

  // Listen to Firestore bins
  onSnapshot(binsRef, snapshot => {
    clearMarkers("bins");
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.location) return;
      const { lat, lng } = data.location;
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: binIcon }).bindPopup(`
        <strong>Bin ID:</strong> ${data.binId || "-"}<br>
        <strong>Fill:</strong> ${data.filledPercentage || 0}%<br>
        <strong>Area:</strong> ${data.coveredArea || "-"} km²
      `);

      markers.bins.push(marker);
    });
    updateLayers();
  });

  // Listen to Firestore plants
  onSnapshot(plantsRef, snapshot => {
    clearMarkers("plants");
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.location) return;
      const { lat, lng } = data.location;
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: plantIcon }).bindPopup(`
        <strong>Plant:</strong> ${data.plantId || "-"}<br>
        <strong>City:</strong> ${data.city || "-"}<br>
        <strong>Trucks:</strong> ${data.trucksAvailable || 0}/${data.numTrucks || 0}<br>
        <strong>Bins:</strong> ${data.numBins || 0}
      `);

      markers.plants.push(marker);
    });
    updateLayers();
  });

  // Listen to Firestore reports
  onSnapshot(reportsRef, snapshot => {
    clearMarkers("reports");
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!data.location) return;
      const { lat, lng } = data.location;
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: reportIcon }).bindPopup(`
        <strong>Report:</strong> ${data.title || "Issue"}<br>
        <strong>Status:</strong> ${data.status || "Open"}<br>
        <strong>Details:</strong> ${data.description || ""}
      `);

      markers.reports.push(marker);
    });
    updateLayers();
  });

  // Route generation
  let routeControl = null;
  function generateRandomRoute() {
    const start = [28.61 + Math.random()*0.05, 77.20 + Math.random()*0.05];
    const end = [28.61 + Math.random()*0.05, 77.20 + Math.random()*0.05];

    if (routeControl) routeMap.removeControl(routeControl);

    routeControl = L.Routing.control({
      waypoints: [L.latLng(start), L.latLng(end)],
      lineOptions: { styles: [{ color: "#4f46e5", weight: 5 }] },
      addWaypoints: false,
      show: false
    }).addTo(routeMap);
  }

  $("btnGenerateRoute")?.addEventListener("click", generateRandomRoute);

  // Layer toggle listeners
  ["layerBins", "layerPlants", "layerComplaints"].forEach(id => {
    $(id)?.addEventListener("change", updateLayers);
  });
});


const notificationBtn = document.getElementById("notificationBtn");
const notificationsPanel = document.getElementById("notifications"); // this is your section

notificationBtn.addEventListener("click", (e) => {
  e.preventDefault();
  notificationsPanel.classList.toggle("d-none"); // hides/shows section
  notificationsPanel.scrollIntoView({ behavior: "smooth" }); // scroll to it
});

// profile button 
const profileBtn = document.getElementById("profileBtn");
const profilePanel = document.getElementById("profile");

profileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  profilePanel.classList.toggle("d-none"); // hides/shows section
  profilePanel.scrollIntoView({ behavior: "smooth" }); // scroll to it
});
// Profile Dropdown — Firebase Auth
const profileName = document.getElementById("adminName");
const profileUsername = document.getElementById("adminUsername");
const profileEmail = document.getElementById("adminEmail");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Dynamic info
    profileName.textContent = user.displayName || "Admin";
    profileUsername.textContent = "@" + (user.email.split("@")[0] || "admin");
    profileEmail.textContent = user.email;

    // Logout
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout error:", err);
      }
    });
  }
});

