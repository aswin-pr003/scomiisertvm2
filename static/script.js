import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDMeX3-iFLWVy17IzqUijXwAFFroO1LjvM",
  authDomain: "scom-1e5e6.firebaseapp.com",
  projectId: "scom-1e5e6",
  storageBucket: "scom-1e5e6.appspot.com",
  messagingSenderId: "670586958567",
  appId: "1:670586958567:web:6b264ba16f44137ebda842",
  measurementId: "G-BVZPMP1G8B",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let data = [];
let attendance = {};
let sessionUser = "";

// === Login ===
function handleSubmit(event) {
  event.preventDefault();
  const user = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value.trim();
  if (!user || !password) return alert("Enter valid credentials");
  GetData(user, password);
}

function GetData(user, password) {
  fetch("res/data.json")
    .then((res) => res.text())
    .then((responseData) => {
      const decrypted = CryptoJS.Rabbit.decrypt(responseData, password).toString(CryptoJS.enc.Utf8);
      const json = JSON.parse(decrypted);
      if (!json[user]) return alert("Incorrect user or password");
      data = json[user];
      sessionUser = user;
      directs();
    })
    .catch(() => alert("Error fetching user data"));
}

// === Show card input ===
function directs() {
  document.getElementById("login").style.display = "none";
  document.getElementById("cardBox").style.display = "block";
  document.getElementById("attendanceBtn").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";
  const input = document.getElementById("cardInput");
  input.value = "";
  input.focus();
  input.addEventListener("input", inputBox);
}

// === Card validation ===
function checkCard(x) {
  return data.includes(x);
}

async function inputBox() {
  const input = document.getElementById("cardInput");
  const val = input.value.trim();
  if (val.length === 10) {
    if (attendance[val]) {
      displayMessage("CARD ALREADY USED", "red");
      return resetInput();
    }
    if (checkCard(val)) {
      attendance[val] = true;
      displayMessage("PASS", "green");
      await saveAttendance(val);
    } else {
      displayMessage("FAIL", "red");
    }
    resetInput();
  }
}

// === Save Attendance ===
async function saveAttendance(cardNumber) {
  try {
    await addDoc(collection(db, "attendanceRecords"), {
      session: sessionUser,
      cardNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Firestore save error:", err);
  }
}

function displayMessage(text, color) {
  const box = document.getElementById("outputBox");
  const output = document.getElementById("output");
  box.style.backgroundColor = color;
  output.innerHTML = text;
}

function resetInput() {
  setTimeout(() => {
    document.getElementById("cardInput").value = "";
    document.getElementById("outputBox").style.backgroundColor = "white";
    document.getElementById("output").innerHTML = "";
  }, 800);
}

// === Logout ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  data = [];
  attendance = {};
  sessionUser = "";
  document.getElementById("login").style.display = "block";
  document.getElementById("cardBox").style.display = "none";
  document.getElementById("attendanceBtn").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
});

// === Attendance Page ===
document.getElementById("attendanceBtn").addEventListener("click", () => {
  window.location.href = "attendance.html";
});

// === Attach form handler ===
document.getElementById("form").addEventListener("submit", handleSubmit);
