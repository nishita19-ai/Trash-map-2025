// citizendashboard.js — CleanTrack Citizen Dashboard logic
import { auth, db } from "./firebaseconfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { collection, onSnapshot, query, where, getDocs, setDoc, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Helpers
function $(id) { return document.getElementById(id); }

// ==== PRELOADER ====
const preloader = $("ct-preloader");
window.addEventListener("load", () => {
  if (preloader) {
    preloader.classList.add("loaded");
    setTimeout(() => (preloader.style.display = "none"), 1000);
  }
});

// Toast utility
function showToast(message, type = "info") {
  const container = $("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 fade`;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 4000 });
  bsToast.show();
}

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

// ========== KPI ==========
// ===== Counter Animation =====
function animateCounter(el, target, suffix = "", duration = 1000) {
  let start = 0;
  let startTime = null;
  target = Number(target);

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const value = Math.floor(progress * target);
    el.textContent = value + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ===== KPI Update =====
async function updateKPIs() {
  const user = auth.currentUser;
  if (!user) return; // wait for login

  // 1. Fetch reports count for this user
  const q = query(collection(db, "reports"), where("userId", "==", user.uid));
  const snapshot = await getDocs(q);
  const reportCount = snapshot.size;

  // 2. Example simulated values (replace later if you track these in Firestore)
  const avgResolution = Number((Math.random() * 24).toFixed(1));
  const cityScore = Number((Math.random() * 20 + 70).toFixed(0));
  const rewards = Math.floor(Math.random() * 200 + 50);

  // 3. Animate values
  animateCounter($("kpiOpenReports"), reportCount);
  animateCounter($("kpiAvgResolution"), avgResolution, " hrs");
  animateCounter($("kpiCityScore"), cityScore, "%");
  animateCounter($("kpiRewardPoints"), rewards);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    updateKPIs();
  }
});

// Refresh button
$("btnRefresh")?.addEventListener("click", () => {
  updateKPIs();
  showToast("Data refreshed", "info");
});
// ========== MAP ==========
document.addEventListener("DOMContentLoaded", () => {
  const map = L.map("city-map").setView([28.4595, 77.0266], 12); // Default Gurgaon

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const createIcon = (iconHtml, cls = "") =>
    L.divIcon({
      html: `<i class="bi ${iconHtml} ${cls}"></i>`,
      className: "custom-marker",
      iconSize: [30, 30],
      popupAnchor: [0, -10]
    });

  const binIcon = createIcon("bi-trash2-fill", "marker-bin");
  const plantIcon = createIcon("bi-recycle", "marker-plant");
  const reportIcon = createIcon("bi-exclamation-triangle-fill", "marker-report");

  const binsRef = collection(db, "bins");
  const plantsRef = collection(db, "plants");
  const reportsRef = collection(db, "reports");

  const markers = { bins: [], plants: [], reports: [] };

  const clearMarkers = (type) => {
    markers[type].forEach(m => map.removeLayer(m));
    markers[type] = [];
  };

  // ========== Firestore Sync ==========

  // Bins
  onSnapshot(binsRef, (snapshot) => {
    clearMarkers("bins");
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.location || data.location.lat == null || data.location.lng == null) return;
      const lat = parseFloat(data.location.lat);
      const lng = parseFloat(data.location.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: binIcon })
        .bindPopup(`
          <strong>Bin ID:</strong> ${data.binId || "-"}<br>
          <strong>Fill:</strong> ${data.filledPercentage || 0}%<br>
          <strong>Area:</strong> ${data.coveredArea || "-"} km²
        `);
      markers.bins.push(marker);
    });
    updateLayers();
  });

  // Plants
  onSnapshot(plantsRef, (snapshot) => {
    clearMarkers("plants");
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.location || data.location.lat == null || data.location.lng == null) return;
      const lat = parseFloat(data.location.lat);
      const lng = parseFloat(data.location.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: plantIcon })
        .bindPopup(`
          <strong>Plant:</strong> ${data.plantId || "-"}<br>
          <strong>City:</strong> ${data.city || "-"}<br>
          <strong>Trucks:</strong> ${data.trucksAvailable || 0}/${data.numTrucks || 0}<br>
          <strong>Bins:</strong> ${data.numBins || 0}
        `);
      markers.plants.push(marker);
    });
    updateLayers();
  });

  // Reports
  onSnapshot(reportsRef, (snapshot) => {
    clearMarkers("reports");
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.location || data.location.lat == null || data.location.lng == null) return;
      const lat = parseFloat(data.location.lat);
      const lng = parseFloat(data.location.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], { icon: reportIcon })
        .bindPopup(`
          <strong>Report:</strong> ${data.title || "Issue"}<br>
          <strong>Status:</strong> ${data.status || "Open"}<br>
          <strong>Details:</strong> ${data.description || ""}
        `);
      markers.reports.push(marker);
    });
    updateLayers();
  });

  // ========== Layer Toggle ==========
  const updateLayers = () => {
    ["bins", "plants", "reports"].forEach(type => {
      markers[type].forEach(m => map.removeLayer(m));
    });

    if ($("layerBins").checked) markers.bins.forEach(m => m.addTo(map));
    if ($("layerPlants").checked) markers.plants.forEach(m => m.addTo(map));
    if ($("layerComplaints").checked) markers.reports.forEach(m => m.addTo(map));
  };

  document.querySelectorAll("input[name='mapLayer']").forEach(radio => {
    radio.addEventListener("change", updateLayers);
  });

  // ========== Locate Me ==========
  $("btnLocate").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 15);
          L.marker([latitude, longitude], {
            icon: createIcon("bi-geo-alt-fill", "text-danger")
          }).addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();
        },
        () => alert("Location access denied")
      );
    } else {
      alert("Geolocation not supported");
    }
  });
});

// ========== CHARTS ==========
const ctxClean = $("chartCityCleanliness");
new Chart(ctxClean, {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      label: "Cleanliness %",
      data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 20 + 70)),
      borderColor: "#22d3ee",
      backgroundColor: "rgba(34,211,238,0.2)",
      tension: 0.3,
      fill: true
    }]
  },
  options: { responsive: true, plugins: { legend: { display: false } } }
});

const ctxRes = $("chartResolutionTimes");
new Chart(ctxRes, {
  type: "bar",
  data: {
    labels: ["Overflowing Bin", "Illegal Dumping", "Street Litter", "Other"],
    datasets: [{
      label: "Resolution (hrs)",
      data: Array.from({ length: 4 }, () => (Math.random() * 20 + 5).toFixed(1)),
      backgroundColor: ["#22d3ee", "#60a5fa", "#a78bfa", "#f472b6"]
    }]
  },
  options: { responsive: true, plugins: { legend: { display: false } } }
});

// ========== REPORTS ==========
const tableBody = document.querySelector("#tableMyReports tbody");

async function loadReports(uid) {
  tableBody.innerHTML = "";
  try {
    const q = query(collection(db, "reports"), where("userId", "==", uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center text-muted">No reports found</td>`;
      tableBody.appendChild(row);
      return;
    }
    let i = 1;
    snapshot.forEach((doc) => {
      const r = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i++}</td>
        <td>${r.timestamp ? r.timestamp.toDate().toLocaleDateString() : "-"}</td>
        <td>${r.category}</td>
        <td>${r.area}</td>
        <td><span class="badge text-bg-${r.status === "Resolved" ? "success" : "warning"}">${r.status}</span></td>
        <td>${r.resolutionTime || "-"} hrs</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-info">View</button></td>`;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading reports", err);
    showToast("Failed to load reports", "danger");
  }
}

// ========== LOGOUT ==========
$("btnLogout").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

//=======profile box=====//
const navProfile = $("navProfile");
const profileBox = $("profileBox");
const closeProfile = $("closeProfile");

navProfile.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const user = auth.currentUser;
    if (!user) {
      alert("No user logged in.");
      return;
    }
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      $("profileName").innerText = data.name || "N/A";
      $("profileEmail").innerText = data.email || "N/A";
      $("profileType").innerText = data.userType || "N/A";
    }
    profileBox.style.display = "block";
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
});
closeProfile.addEventListener("click", () => {
  profileBox.style.display = "none";
});
document.addEventListener("click", (e) => {
  if (!profileBox.contains(e.target) && !navProfile.contains(e.target)) {
    profileBox.style.display = "none";
  }
});

//===== MAP MODAL =====
document.addEventListener('DOMContentLoaded', () => {
  const btnModalLocate = $("btnModalLocate");
  const inputLocation = $("inputLocation");
  let map, marker;

  function initMapModal() {
    if (!map) {
      map = L.map('mapModal', { center: [28.6139, 77.2090], zoom: 13 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }
    if (!marker) {
  marker = L.marker(map.getCenter(), {
    draggable: true,
    autoPan: true // 👈 helps when dragging near edges
  }).addTo(map);

  marker.on('dragend', () => {
    const { lat, lng } = marker.getLatLng();
    inputLocation.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  });
}
    const { lat, lng } = map.getCenter();
    inputLocation.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  btnModalLocate.addEventListener('click', () => {
    const modalEl = $("mapModalWindow");
    if (!modalEl) return;
    const mapModal = new bootstrap.Modal(modalEl);
    mapModal.show();
    setTimeout(() => {
  initMapModal();
  map.invalidateSize();
  if (marker) marker.dragging.enable(); // 👈 ensures PC dragging works
}, 300);
  });
});

// ====== Submit Report ======
const reportsRef2 = collection(db, 'reports');
$("btnSubmitReport").addEventListener('click', async () => {
  if (!formNewReport.checkValidity()) {
    formNewReport.classList.add('was-validated');
    return;
  }
  try {
    const newDocRef = doc(reportsRef2);
    const reportId = newDocRef.id;
    let lat = null, lng = null;
    if (inputLocation.value) {
      const parts = inputLocation.value.split(",");
      if (parts.length === 2) {
        lat = parseFloat(parts[0]);
        lng = parseFloat(parts[1]);
      }
    }
    const reportData = {
      reportId,
      userId: currentUser.uid,
      category: $("inputCategory").value,
      area: $("inputArea").value,
      details: $("inputDetails").value,
      location: lat && lng ? { lat, lng } : null,
      resolved: false,
      status: "Open",
      timestamp: serverTimestamp(),
    };
    if (inputPhoto.files.length > 0) {
      const file = inputPhoto.files[0];
      // reportData.photoURL = await uploadPhoto(file, reportId);
    }
    await setDoc(newDocRef, reportData);
    formNewReport.reset();
    formNewReport.classList.remove('was-validated');
    inputLocation.value = '';
    showToast("Report submitted successfully!", "success");
    await loadReports(currentUser.uid);
  } catch (err) {
    console.error("Error submitting report:", err);
    showToast("Failed to submit report.", "danger");
  }
});

// ========== FOOTER ==========
$("yearNow").textContent = new Date().getFullYear();
