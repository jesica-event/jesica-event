document.addEventListener("DOMContentLoaded", () => {
  let savedPassword = "";

  // Password Form elements
  const lockOverlay = document.getElementById("lockOverlay");
  const lockCard = document.getElementById("lockCard");
  const passwordInput = document.getElementById("passwordInput");
  const btnUnlock = document.getElementById("btnUnlock");

  // Load initial CSV data
  function loadCSVData() {
    fetch("master-tim.csv?t=" + new Date().getTime())
      .then(res => res.ok ? res.text() : Promise.reject())
      .then(text => {
        const lines = text.trim().split("\n");
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length === 2) {
            const teamName = cols[0].trim().toLowerCase();
            const kemenangan = parseInt(cols[1].trim(), 10) || 0;

            const row = document.querySelector(`.team-row[data-team="${teamName}"]`);
            if (row) {
              const input = row.querySelector(".victory-input");
              if (input) {
                input.value = kemenangan;
                updateRowPoints(row, kemenangan);
              }
            }
          }
        }
      })
      .catch(err => {
        console.error("Gagal memuat data CSV awal", err);
      });
  }

  function updateRowPoints(row, kemenangan) {
    const preview = row.querySelector(".points-preview");
    if (preview) {
      preview.innerHTML = `${kemenangan * 10}<span>poin</span>`;
    }
  }

  // Password Verification
  function checkPassword() {
    const pass = passwordInput.value;
    
    fetch("/verify-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password: pass })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        savedPassword = pass;
        lockOverlay.classList.add("hidden");
        loadCSVData();
      } else {
        lockCard.classList.add("shake");
        passwordInput.value = "";
        setTimeout(() => lockCard.classList.remove("shake"), 400);
      }
    })
    .catch(err => {
      console.error("Gagal memverifikasi password", err);
      lockCard.classList.add("shake");
      passwordInput.value = "";
      setTimeout(() => lockCard.classList.remove("shake"), 400);
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

    const scores = [];
    rows.forEach(row => {
      const tim = row.getAttribute("data-team");
      const input = row.querySelector(".victory-input");
      const kemenangan = parseInt(input.value, 10) || 0;
      scores.push({ tim, kemenangan });
    });

    fetch("/update-scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: savedPassword,
        scores: scores
      })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast("Perubahan berhasil disimpan! 💾");
      } else {
        showToast("Gagal menyimpan data: " + resData.message, true);
      }
    })
    .catch(err => {
      showToast("Error menghubungi server: " + err, true);
    });
  });
});
