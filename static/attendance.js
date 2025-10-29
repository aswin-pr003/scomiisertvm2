import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyDMeX3-iFLWVy17IzqUijXwAFFroO1LjvM",
  authDomain: "scom-1e5e6.firebaseapp.com",
  projectId: "scom-1e5e6",
  storageBucket: "scom-1e5e6.appspot.com",
  messagingSenderId: "670586958567",
  appId: "1:670586958567:web:6b264ba16f44137ebda842",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let allData = [];

// === AUTH LOGIC ===
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");
const signInBtn = document.getElementById("googleSignInBtn");

signInBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Login failed:", error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginSection.classList.remove("active");
    dashboard.classList.add("active");
    logoutBtn.style.display = "block";
    loadData();
  } else {
    dashboard.classList.remove("active");
    loginSection.classList.add("active");
    logoutBtn.style.display = "none";
  }
});

// === FIRESTORE FUNCTIONS ===
async function loadData() {

    const user = auth.currentUser;
    if(user){
    const snapshot = await getDocs(collection(db, "attendanceRecords"));
    allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    populateSessionFilter();
    renderTable(allData);
}
    else{ 
        alert("Unauthorized. Please sign in first.");
        window.location.href = "attendance.html"; 
    }
  
}

function populateSessionFilter() {
  const select = document.getElementById("sessionFilter");
  select.innerHTML = `<option value="">All Sessions</option>`;
  const sessions = [...new Set(allData.map(d => d.session))];
  sessions.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    select.appendChild(opt);
  });
}

function renderTable(data) {
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";
  data.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.session}</td>
      <td>${row.cardNumber}</td>
      <td>${new Date(row.timestamp).toLocaleString()}</td>
      <td><button onclick="deleteRecord('${row.id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteRecord = async function (id) {
  if (confirm("Delete this record?")) {
    await deleteDoc(doc(db, "attendanceRecords", id));
    allData = allData.filter(d => d.id !== id);
    applyFilters();
  }
};

// === FILTERING ===
function applyFilters() {
  const session = document.getElementById("sessionFilter").value;
  const sortOrder = document.getElementById("sortOrder").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  let filtered = [...allData];
  if (session) filtered = filtered.filter(d => d.session === session);
  if (start) filtered = filtered.filter(d => new Date(d.timestamp) >= new Date(start));
  if (end) filtered = filtered.filter(d => new Date(d.timestamp) <= new Date(end));

  filtered.sort((a, b) =>
    sortOrder === "asc"
      ? new Date(a.timestamp) - new Date(b.timestamp)
      : new Date(b.timestamp) - new Date(a.timestamp)
  );

  renderTable(filtered);
  return filtered;
}

document.getElementById("applyFilters").addEventListener("click", applyFilters);

// === CSV DOWNLOAD ===
document.getElementById("downloadBtn").addEventListener("click", () => {
  const filtered = applyFilters();
  if (filtered.length === 0) return alert("No records to download.");
  const headers = Object.keys(filtered[0]);
  const csvRows = [
    headers.join(","),
    ...filtered.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "attendance.csv";
  link.click();
});
