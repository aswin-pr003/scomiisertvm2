import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
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

const success = new Audio("res/bell.mp3");
const fail = new Audio("res/permissiondenied.mp3");


// === LOGIN HANDLER ===
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

// === SHOW CARD INPUT AFTER LOGIN ===
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

// === CARD VALIDATION ===
function checkCard(x) {
  return data.includes(x);
}

async function inputBox() {
  const input = document.getElementById("cardInput");
  const val = input.value.trim();
  //const mealType = document.getElementById("mealType").value;

  if (val.length === 10) {
    if (selectedMealType === "none") {
      displayMessage("SELECT MEAL TYPE", "orange");
      return resetInput();
    }

    console.log(selectedMealType)
    // Check if already exists in Firestore
    const alreadyUsed = await checkFirestoreDuplicate(val, selectedMealType);
    if (alreadyUsed) {
      displayMessage("CARD ALREADY USED", "red");
      return resetInput();
    }

    else if (checkCard(val)) {

      displayMessage("PASS", "green");
      await saveAttendance(val, selectedMealType);
    } else {
      displayMessage("FAIL", "red");
    }
    resetInput();
  }
}

// === CHECK FIRESTORE DUPLICATE ===
async function checkFirestoreDuplicate(cardNumber, mealType) {
  const today = toLocalISOString(new Date()).split("T")[0]; // YYYY-MM-DD
  const q = query(
    collection(db, "attendanceRecords"),
    where("cardNumber", "==", cardNumber),
    where("cdh", "==", sessionUser),
    where("sessionType", "==", mealType),
    where("date", "==", today)
  );
  const querySnap = await getDocs(q);
  return !querySnap.empty;
}

function toLocalISOString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, -1); // remove trailing 'Z'
}


// === SAVE ATTENDANCE TO FIRESTORE ===
async function saveAttendance(cardNumber, mealType) {
  const now = new Date();
  const date = toLocalISOString(now).split("T")[0];
  const timestamp = toLocalISOString(now);
    
  try {
    await addDoc(collection(db, "attendanceRecords"), {
      cdh: sessionUser,
      cardNumber,
      sessionType: mealType,
      date,
      timestamp,
    });
  } catch (err) {
    console.error("Firestore save error:", err);
  }
}

// === DISPLAY MESSAGE ===
function displayMessage(text, color) {
  if(color=='green'){success.play();}
  if(color=='red'){fail.play();}
  const box = document.getElementById("outputBox");
  const output = document.getElementById("output");
  box.style.backgroundColor = color;
  output.innerHTML = text;
  
}

// === RESET INPUT ===
function resetInput() {
  setTimeout(() => {
    document.getElementById("cardInput").value = "";
    document.getElementById("outputBox").style.backgroundColor = "white";
    document.getElementById("output").innerHTML = "";
  }, 800);
}

// === LOGOUT ===
document.getElementById("logoutBtn").addEventListener("click", () => {
  data = [];
  attendance = {};
  sessionUser = "";
  window.location.href = "index.html";
  // document.getElementById("login").style.display = "block";
  // document.getElementById("cardBox").style.display = "none";
  // document.getElementById("attendanceBtn").style.display = "none";
  // document.getElementById("logoutBtn").style.display = "none";
});

// === ATTENDANCE PAGE ===
document.getElementById("attendanceBtn").addEventListener("click", () => {
  window.location.href = "attendance.html";
});

// === ATTACH FORM HANDLER ===
document.getElementById("form").addEventListener("submit", handleSubmit);

let selectedMealType = "none";

// Add event listener
document.getElementById("mealType").addEventListener("change", function (e) {
  selectedMealType = e.target.value;
  
});
