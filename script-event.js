import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL5nTTKfpXPvAfETSwPnAPOyTXK8IF07o",
  authDomain: "jesica-event.firebaseapp.com",
  projectId: "jesica-event",
  storageBucket: "jesica-event.firebasestorage.app",
  messagingSenderId: "665593366219",
  appId: "1:665593366219:web:d3db0160694db32996bd4e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  let savedPassword = "";

  // Password Form elements
  const lockOverlay = document.getElementById("lockOverlay");
  const lockCard = document.getElementById("lockCard");
  const passwordInput = document.getElementById("passwordInput");
  const btnUnlock = document.getElementById("btnUnlock");

  // Load initial Firebase data from master-tim collection
  function loadFirebaseData() {
    const collRef = collection(db, "master-tim");
    getDocs(collRef).then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const teamName = doc.id.toLowerCase();
        const kemenangan = parseInt(doc.data().kemenangan, 10) || 0;
        const row = document.querySelector(`.team-row[data-team="${teamName}"]`);
        if (row) {
          const input = row.querySelector(".victory-input");
          if (input) {
            input.value = kemenangan;
            updateRowPoints(row, kemenangan);
          }
        }
      });
    }).catch(err => {
      console.error("Gagal memuat data dari Firestore:", err);
    });
  }

  function updateRowPoints(row, kemenangan) {
    const preview = row.querySelector(".points-preview");
    if (preview) {
      preview.innerHTML = `${kemenangan * 10}<span>poin</span>`;
    }
  }

  // Password Verification via Firestore document
  function checkPassword() {
    const pass = passwordInput.value;
    const docRef = doc(db, "config", "settings");
    
    btnUnlock.disabled = true;
    btnUnlock.textContent = "Memverifikasi...";

    getDoc(docRef).then((docSnap) => {
      let remotePassword = "";
      if (docSnap.exists()) {
        remotePassword = docSnap.data().password;
      }
      
      // Fallback jika belum ada password di Firestore
      if (!remotePassword) {
        remotePassword = "T3Ls19#0";
        setDoc(doc(db, "config", "settings"), { password: remotePassword });
      }

      if (pass === remotePassword) {
        savedPassword = pass;
        lockOverlay.classList.add("hidden");
        loadFirebaseData();
      } else {
        lockCard.classList.add("shake");
        passwordInput.value = "";
        setTimeout(() => lockCard.classList.remove("shake"), 400);
      }
    }).catch(err => {
      console.error("Error Firestore auth:", err);
      alert("Gagal memverifikasi password ke Firestore. Periksa koneksi internet atau security rules Firestore Anda.");
      lockCard.classList.add("shake");
      setTimeout(() => lockCard.classList.remove("shake"), 400);
    }).finally(() => {
      btnUnlock.disabled = false;
      btnUnlock.textContent = "Buka Pengaturan";
    });
  }

  btnUnlock.addEventListener("click", checkPassword);
  passwordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") checkPassword();
  });

  // Handle Inputs plus/minus
  const rows = document.querySelectorAll(".team-row");
  rows.forEach(row => {
    const input = row.querySelector(".victory-input");
    const btnMinus = row.querySelector(".btn-minus");
    const btnPlus = row.querySelector(".btn-plus");

    btnMinus.addEventListener("click", () => {
      let val = parseInt(input.value, 10) || 0;
      if (val > 0) {
        val--;
        input.value = val;
        updateRowPoints(row, val);
      }
    });

    btnPlus.addEventListener("click", () => {
      let val = parseInt(input.value, 10) || 0;
      val++;
      input.value = val;
      updateRowPoints(row, val);
    });

    input.addEventListener("input", () => {
      let val = parseInt(input.value, 10) || 0;
      if (val < 0) val = 0;
      input.value = val;
      updateRowPoints(row, val);
    });
  });

  // Show Toast Notification
  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    if (isError) {
      toast.classList.add("error");
    } else {
      toast.classList.remove("error");
    }
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  // Submit Form
  const form = document.getElementById("settingsForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const newPass = document.getElementById("newPasswordInput").value;
    const confirmPass = document.getElementById("confirmPasswordInput").value;

    // Jika user berniat mengubah password
    if (newPass || confirmPass) {
      if (newPass !== confirmPass) {
        showToast("Password baru tidak cocok!", true);
        return;
      }
      if (newPass.length < 4) {
        showToast("Password minimal 4 karakter!", true);
        return;
      }
    }

    // Verifikasi ulang password saat menyimpan
    const docRef = doc(db, "config", "settings");
    getDoc(docRef).then((docSnap) => {
      const remotePassword = docSnap.exists() ? docSnap.data().password : "T3Ls19#0";
      if (savedPassword !== remotePassword) {
        showToast("Sesi habis atau password salah!", true);
        return;
      }

      const promises = [];

      // Jika user ingin mengupdate password
      if (newPass) {
        promises.push(setDoc(docRef, { password: newPass }));
      }

      // Simpan data masing-masing tim ke Firestore
      rows.forEach(row => {
        const tim = row.getAttribute("data-team");
        const input = row.querySelector(".victory-input");
        const kemenangan = parseInt(input.value, 10) || 0;
        
        const teamDocRef = doc(db, "master-tim", tim);
        promises.push(setDoc(teamDocRef, { kemenangan: kemenangan }));
      });

      Promise.all(promises)
        .then(() => {
          if (newPass) {
            savedPassword = newPass; // Update password tersimpan di session
            document.getElementById("newPasswordInput").value = "";
            document.getElementById("confirmPasswordInput").value = "";
            showToast("Data dan password berhasil disimpan! 💾🔒");
          } else {
            showToast("Perubahan berhasil disimpan! 💾");
          }
        })
        .catch(err => {
          showToast("Gagal menyimpan ke Firebase: " + err.message, true);
        });
    });
  });
});
