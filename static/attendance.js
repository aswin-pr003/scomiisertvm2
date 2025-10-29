import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

let allData = [];

async function loadData() {
  const snapshot = await getDocs(collection(db, "attendanceRecords"));
  allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  populateSessionFilter();
  renderTable(allData);
}

function populateSessionFilter() {
  const select = document.getElementById("sessionFilter");
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

// === Filter logic ===
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
document.getElementById("backBtn").addEventListener("click", () => window.location.href = "index.html");

// === CSV download ===
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

loadData();
