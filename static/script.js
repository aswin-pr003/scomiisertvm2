// === Firebase imports ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

fetch('/api/data', { cache: 'reload' });

// === Firebase Configuration ===
const firebaseConfig = {
  apiKey: "AIzaSyDMeX3-iFLWVy17IzqUijXwAFFroO1LjvM",
  authDomain: "scom-1e5e6.firebaseapp.com",
  projectId: "scom-1e5e6",
  storageBucket: "scom-1e5e6.appspot.com",
  messagingSenderId: "670586958567",
  appId: "1:670586958567:web:6b264ba16f44137ebda842",
  measurementId: "G-BVZPMP1G8B",
};

// === Initialize Firebase ===
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === Global variables ===
let data = [];
let attendance = {};
let sessionUser = "";

// === Audio ===
const bell = new Audio("res/bell.mp3");
const permissiondenied = new Audio("res/permissiondenied.mp3");

// === Handle login ===

function handleSubmit(event) {
  event.preventDefault(); // ✅ Prevent page reload

  const user = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value.trim();

  if (!user || !password) {
    alert("User and password can't be empty");
    return;
  }

  GetData(user, password);
};
// === Fetch and decrypt card data ===
function GetData(user, password) {
  fetch("res/data.json")
    .then((res) => res.text())
    .then((responseData) => {
      const decrypted_data = decrypt(responseData, password);
      const dataJSON = JSON.parse(decrypted_data);

      if (!dataJSON[user] || dataJSON[user].length === 0) {
        alert("User or password may be incorrect or try again later");
        return;
      }

      data = dataJSON[user];
      attendance = {};
      sessionUser = user;
      directs();
    })
    .catch((err) => {
      alert("Error fetching data. Try again later.");
      console.error(err);
    });
}

// === Decrypt function ===
function decrypt(string, password) {
  const x = CryptoJS.Rabbit.decrypt(string, password);
  return x.toString(CryptoJS.enc.Utf8);
}

// === Check if card valid ===
function checkCard(x) {
  return data.includes(x);
}

// === Handle card input ===
window.inputBox = async function () {
  const textinput = document.getElementById("cardInput");
  const val = textinput.value.trim();
  const len = val.length;

  if (len === 10) {
    if (attendance[val]) {
      displayMessage("CARD ALREADY USED", "red");
      permissiondenied.play();
      resetInput();
      return;
    }

    if (checkCard(val)) {
      attendance[val] = true;
      displayMessage("PASS", "green");
      bell.play();
      await saveAttendance(val);
    } else {
      displayMessage("FAIL", "red");
      permissiondenied.play();
    }

    resetInput();
  } else if (len > 10) {
    textinput.value = "";
  }
};

// === Save attendance to Firestore ===
async function saveAttendance(cardNumber) {
  const timestamp = new Date().toISOString();
  try {
    await addDoc(collection(db, "attendanceRecords"), {
      session: sessionUser,
      cardNumber,
      timestamp,
    });
  } catch (err) {
    console.error("Firestore save error:", err);
  }
}

// === Display messages ===
function displayMessage(text, color) {
  const box = document.getElementById("outputBox");
  const output = document.getElementById("output");
  box.style.backgroundColor = color;
  output.innerHTML = text;
}

// === Reset UI after tap ===
function resetInput() {
  setTimeout(() => {
    document.getElementById("cardInput").value = "";
    document.getElementById("box").style.backgroundColor = "white";
    document.getElementById("output").innerHTML = "";
  }, 800);
}

// === Prepare UI after login ===
function directs() {
  // Hide login
  document.getElementById("login").style.display = "none";

  // Show card box
  document.getElementById("cardBox").style.display = "block";

  // Focus on card input
  const cardInput = document.getElementById("cardInput");
  cardInput.value = "";
  cardInput.focus();
  cardInput.addEventListener("input", inputBox);

  // Show download button
  document.getElementById("downloadBtn").style.display = "block";
  document.getElementById("downloadBtn").addEventListener("click", downloadAttendance);
}


// === Download attendance as Excel ===
async function downloadAttendance() {
  const querySnapshot = await getDocs(collection(db, "attendanceRecords"));
  const rows = [];

  querySnapshot.forEach((doc) => {
    rows.push(doc.data());
  });

  if (rows.length === 0) {
    alert("No attendance records found!");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  XLSX.writeFile(workbook, "attendance.xlsx");
}


const form = document.getElementById("form");
form.addEventListener("submit", handleSubmit);
