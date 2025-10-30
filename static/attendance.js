import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp
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

let filteredData = [];
let currentPage = 1;
const rowsPerPage = 50;

let allData = [];

let filterActive = false;
let filtered = [];



// === AUTH LOGIC ===
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");
const signInBtn = document.getElementById("googleSignInBtn");

signInBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("Login failed:", error);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  //window.location.href = "attendance.html";
});


onAuthStateChanged(auth, (user) => {
  if (user) {
    renderTable([])
    loginSection.classList.remove("active");
    dashboard.classList.add("active");
    logoutBtn.style.display = "block";
    loadData();
  } else {
    // renderTable([])
    // loginSection.classList.remove("active");
    // dashboard.classList.add("active");
    // logoutBtn.style.display = "block";
    // loadData();
    dashboard.classList.remove("active");
    loginSection.classList.add("active");
    logoutBtn.style.display = "none";
  }
});

// clear screen whenever reloaded
window.addEventListener("beforeunload", async () => {
   await signOut(auth);
   renderTable([])
   dashboard.classList.remove("active");
    loginSection.classList.add("active");
    logoutBtn.style.display = "none";
});

// === FIRESTORE FUNCTIONS ===
async function loadData() {
  try {
    const q = query(collection(db, "attendanceRecords"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    populateCDHFilter();
    //renderTable(allData);
    filteredData = allData;
    renderPaginatedTable();

  } catch (error) {
    alert("Unauthorized. Please sign in first.", error);
    signOut(auth);
    window.location.href = "attendance.html";
  }
}


function populateCDHFilter() {
  const select = document.getElementById("cdhFilter");
  select.innerHTML = `<option value="">All CDHs</option>`;
  const cdhs = [...new Set(allData.map(d => d.cdh))];
  cdhs.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}


function renderTable(data) {
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";
  data.forEach(row => {
    // ensure row.timestamp is a suitable JS Date or epoch
    const ts = row.timestamp instanceof Date ? row.timestamp.getTime()
              : (typeof row.timestamp === "number" ? row.timestamp
              : Date.parse(row.timestamp) || Date.now());

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.cdh ?? ""}</td>
      <td>${row.sessionType ?? ""}</td>
      <td>${row.cardNumber ?? ""}</td>
      <td data-ts="${ts}">${new Date(ts).toLocaleString()}</td>
      <td><button onclick="deleteRecord('${row.id}')">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });
}

let timestampSortAsc = false; // default: show newest first (toggle state)

// Ensure header exists with id="timestampHeader"
const tsHeader = document.getElementById("timestampHeader");
if (tsHeader) {
  tsHeader.style.cursor = "pointer";
  // initial icon
  tsHeader.innerText = `Timestamp ${timestampSortAsc ? "⬆" : "⬇"}`;

  tsHeader.addEventListener("click", () => {
    const tbody = document.querySelector("#attendanceTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // map row -> value using data-ts from 4th cell (index 3)
    const mapped = rows.map(tr => {
      const cell = tr.children[3];
      const val = cell && cell.dataset && cell.dataset.ts ? Number(cell.dataset.ts) : NaN;
      return { tr, val };
    });

    mapped.sort((a, b) => {
      // put NaNs at the end
      if (isNaN(a.val) && isNaN(b.val)) return 0;
      if (isNaN(a.val)) return 1;
      if (isNaN(b.val)) return -1;

      return timestampSortAsc ? a.val - b.val : b.val - a.val;
    });

    // reattach sorted rows
    tbody.innerHTML = "";
    mapped.forEach(m => tbody.appendChild(m.tr));

    // toggle and update icon
    timestampSortAsc = !timestampSortAsc;
    tsHeader.innerText = `Timestamp ${timestampSortAsc ? "⬆" : "⬇"}`;
  });
}





// let sortAscending = true;

// document.getElementById("timestampHeader").addEventListener("click", () => {
//   if (!currentData || currentData.length === 0) return;

//   sortAscending = !sortAscending;
//   const icon = document.getElementById("sortIcon");
//   icon.textContent = sortAscending ? "⬆️" : "⬇️";

//   currentData.sort((a, b) => {
//     const t1 = a.timestamp instanceof Date ? a.timestamp.getTime() : Date.parse(a.timestamp);
//     const t2 = b.timestamp instanceof Date ? b.timestamp.getTime() : Date.parse(b.timestamp);
//     return sortAscending ? t1 - t2 : t2 - t1;
//   });

//   renderTable(currentData);
// });

function toLocalISOString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, -1); // remove trailing 'Z'
}


window.deleteRecord = async function (id) {
  if (confirm("Delete this record?")) {
    await deleteDoc(doc(db, "attendanceRecords", id));
    allData = allData.filter(d => d.id !== id);
    applyFilters();
  }
};

// === FILTERING ===
async function applyFilters() {
  const cdh = document.getElementById("cdhFilter").value;
  const sessionType = document.getElementById("sessionType").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  if (!start || !end) {
    alert("Please select both Start Date and End Date before applying filters.");
    return [];
  }



  const startDate = toLocalISOString(new Date(start)).split('T')[0];
  const endDate = toLocalISOString(new Date(end)).split('T')[0];

  
  // --- Build query dynamically ---
  let constraints = [];

  // always filter by timestamp range
  constraints.push(where("date", ">=", startDate));
  constraints.push(where("date", "<=", endDate));

  // optionally filter by CDH and SessionType if selected
  if (cdh) {
    constraints.push(where("cdh", "==", cdh));
  }
  if (sessionType){
    constraints.push(where("sessionType", "==", sessionType));
  }

  // always order by timestamp (needed for range queries)
  constraints.push(orderBy("timestamp", "desc"));

  // now make query
  const q = query(collection(db, "attendanceRecords"), ...constraints);
  const snapshot = await getDocs(q);

  filteredData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filteredData.length === 0) {
    alert("No records found for selected filters.");
  }

  currentPage = 1;
  renderPaginatedTable();
  return filteredData;
}






function applyFilter() {
  // your existing filter logic
  filtered = applyFilters();
 
}

function clearFilter() {
//   document.getElementById("cdhFilter").value=none;
   document.getElementById("startDate").value="";
   document.getElementById("endDate").value="";
   document.getElementById("sessionType").selectedIndex=0;

    loadData();
  renderPaginatedTable();
}




function renderPaginatedTable() {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const pageData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  renderTable(pageData);

  document.getElementById("paginationInfo").textContent =
    `Showing ${startIndex + 1}–${Math.min(startIndex + rowsPerPage, filteredData.length)} of ${filteredData.length} records (Page ${currentPage}/${totalPages || 1})`;

  document.getElementById("prevPage").disabled = currentPage <= 1;
  document.getElementById("nextPage").disabled = currentPage >= totalPages;
}

// === CSV DOWNLOAD ===
document.getElementById("downloadAllBtn").addEventListener("click", () => {
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


async function downloadData(data, filename) {
  if (!data.length) return alert("No records to download.");
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

document.getElementById("downloadAllBtn").addEventListener("click", async () => {
  await loadData();
  downloadData(allData, "attendance_all.csv");
});

document.getElementById("downloadFilteredBtn").addEventListener("click", async () => {
  const filtered = await applyFilters();
  downloadData(filtered, "attendance_filtered.csv");
});


document.getElementById("deleteFilteredBtn").addEventListener("click", async () => {
  const filtered = await applyFilters();
  if (!filtered || !Array.isArray(filtered) || filtered.length === 0) return alert("No records found for deletion.");

  const confirmMsg = `⚠️ This action will PERMANENTLY delete ${filtered.length} record(s).\nThis cannot be undone.\n\nAre you sure you want to continue?`;
  if (!confirm(confirmMsg)) return;

  for (const record of filtered) {
    await deleteDoc(doc(db, "attendanceRecords", record.id));
  }

  alert(`${filtered.length} record(s) permanently deleted.`);
  loadData();
});


document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderPaginatedTable();
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderPaginatedTable();
  }
});



document.getElementById("filterButton").addEventListener("click", async () => {
  const btn = document.getElementById("filterButton");

  if (!filterActive) {
    const result = await applyFilters();
    if (!result || result.length === 0) {
        clearFilter();
        btn.textContent = "Apply Filter";
        btn.classList.remove("clear");
        filterActive = false;
        return;} // don’t toggle if invalid filter
    btn.textContent = "❌ Clear Filter";
    btn.classList.add("clear");
    filterActive = true;
  } else {
    clearFilter();
    btn.textContent = "Apply Filter";
    btn.classList.remove("clear");
    filterActive = false;
  }
});
