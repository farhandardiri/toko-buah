// ==================== INITIALIZATION ====================
const system = new TokoBuahSystem();

document.addEventListener("DOMContentLoaded", function () {
  // Initialize auth
  initAuth();

  // Set current date for all forms
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Set dates for pembelian form
  const pembelianTanggal = document.getElementById("pembelianTanggal");
  const formBiaya = document.getElementById("formBiaya");
  const reportStartDate = document.getElementById("reportStartDate");
  const reportEndDate = document.getElementById("reportEndDate");

  if (pembelianTanggal) pembelianTanggal.valueAsDate = now;
  if (formBiaya) {
    // console.log("Form biaya ditemukan, setting up event listeners...");

    // Setup event listeners for biaya form
    setupBiayaForm();

    // console.log("Event listeners untuk form biaya berhasil dipasang");
  } else {
    // console.log("Form biaya tidak ditemukan (mungkin tidak di halaman ini)");
  }
  if (reportStartDate)
    reportStartDate.valueAsDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  if (reportEndDate) reportEndDate.valueAsDate = now;

  // Set date for penjualan form
  const penjualanTanggal = document.getElementById("penjualanTanggal");
  if (penjualanTanggal) penjualanTanggal.value = today;

  // Set date for biaya form
  const biayaTanggal = document.getElementById("biayaTanggal");
  if (biayaTanggal) biayaTanggal.value = today;

  // Update current date time
  function updateDateTime() {
    const currentDateTime = document.getElementById("currentDateTime");
    if (currentDateTime) {
      currentDateTime.textContent = new Date().toLocaleString("id-ID");
    }
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

  // Load initial data
  system.loadAllData();

  // ==================== FORM PEMBELIAN HANDLERS ====================
  const formPembelian = document.getElementById("formPembelian");
  if (formPembelian) {
    formPembelian.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!isAuthenticated) {
        showAlert(
          "Silakan login terlebih dahulu untuk menambah data pembelian",
          "warning"
        );
        return;
      }

      const data = {
        tanggal: document.getElementById("pembelianTanggal").value,
        kodeSupplier: document.getElementById("pembelianSupplier").value,
        kodeBuah: document.getElementById("pembelianBuah").value,
        quantity: parseFloat(document.getElementById("pembelianQty").value),
        hargaBeli: parseInt(document.getElementById("pembelianHarga").value),
        keterangan: document.getElementById("pembelianKeterangan").value,
      };

      try {
        await system.simpanPembelian(data);
        showAlert("Pembelian berhasil disimpan!", "success");
        this.reset();
        document.getElementById("pembelianTanggal").valueAsDate = new Date();
      } catch (error) {
        showAlert("Error menyimpan pembelian: " + error.message, "danger");
      }
    });
  }

  // Auto-fill harga when buah is selected in pembelian
  const pembelianBuah = document.getElementById("pembelianBuah");
  if (pembelianBuah) {
    pembelianBuah.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const harga = selectedOption.getAttribute("data-harga");
      const hargaInput = document.getElementById("pembelianHarga");
      if (harga && hargaInput) {
        hargaInput.value = harga;
      }
    });
  }

  // ==================== FORM PENJUALAN HANDLERS ====================
  const formPenjualan = document.getElementById("formPenjualan");
  if (formPenjualan) {
    // Setup event listeners for penjualan form
    setupPenjualanForm();

    formPenjualan.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!isAuthenticated) {
        showAlert(
          "Silakan login terlebih dahulu untuk menambah data penjualan",
          "warning"
        );
        return;
      }

      try {
        await simpanPenjualan();
      } catch (error) {
        showAlert("Error menyimpan penjualan: " + error.message, "danger");
      }
    });
  }
});

// ==================== PENJUALAN FUNCTIONS ====================
let currentStok = 0;
let hargaJual = 0;

function setupPenjualanForm() {
  // Event untuk perubahan buah di penjualan
  const penjualanBuah = document.getElementById("penjualanBuah");
  if (penjualanBuah) {
    penjualanBuah.addEventListener("change", function (e) {
      onBuahChangePenjualan(e.target.value);
    });
  }

  // Event untuk perubahan quantity di penjualan
  const penjualanQty = document.getElementById("penjualanQty");
  if (penjualanQty) {
    penjualanQty.addEventListener("input", function () {
      onQtyChangePenjualan();
    });
  }

  // Event untuk perubahan harga di penjualan
  const penjualanHarga = document.getElementById("penjualanHarga");
  if (penjualanHarga) {
    penjualanHarga.addEventListener("input", function () {
      onHargaChangePenjualan();
    });
  }
}

function populatePenjualanDropdowns() {
  populatePelangganDropdown();
  populateBuahDropdownPenjualan();
}

function populatePelangganDropdown() {
  const select = document.getElementById("penjualanPelanggan");
  if (!select) return;

  select.innerHTML = '<option value="">Pilih Pelanggan</option>';

  if (!system.masterData.pelanggan || system.masterData.pelanggan.length <= 1) {
    const option = document.createElement("option");
    option.value = "UMUM";
    option.textContent = "Pelanggan Umum";
    select.appendChild(option);
    return;
  }

  system.masterData.pelanggan.slice(1).forEach((pelanggan) => {
    const [kode, nama, jenis, kontak] = pelanggan;
    const option = document.createElement("option");
    option.value = kode;
    option.textContent = `${nama} (${jenis})`;
    select.appendChild(option);
  });
}

function populateBuahDropdownPenjualan() {
  const select = document.getElementById("penjualanBuah");
  if (!select) return;

  select.innerHTML = '<option value="">Pilih Buah</option>';

  if (!system.masterData.buah || system.masterData.buah.length <= 1) {
    return;
  }

  system.masterData.buah.slice(1).forEach((buah) => {
    const [kode, nama, kategori, satuan, hargaBeli, hargaJual] = buah;
    const stok = system.calculateCurrentStock(kode);

    // Hanya tampilkan buah yang ada stoknya
    if (stok > 0) {
      const option = document.createElement("option");
      option.value = kode;
      option.textContent = `${nama} - Stok: ${stok} ${satuan} - Harga: ${formatCurrency(
        parseFloat(hargaJual)
      )}`;
      option.setAttribute("data-harga", hargaJual);
      option.setAttribute("data-stok", stok);
      option.setAttribute("data-satuan", satuan);
      select.appendChild(option);
    }
  });

  // Jika tidak ada buah yang ada stok
  if (select.options.length === 1) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tidak ada buah yang tersedia";
    option.disabled = true;
    select.appendChild(option);
  }
}

function onBuahChangePenjualan(kodeBuah) {
  const select = document.getElementById("penjualanBuah");
  const selectedOption = select.options[select.selectedIndex];

  if (kodeBuah && selectedOption) {
    hargaJual = parseFloat(selectedOption.getAttribute("data-harga")) || 0;
    currentStok = parseFloat(selectedOption.getAttribute("data-stok")) || 0;
    const satuan = selectedOption.getAttribute("data-satuan") || "kg";

    // Set harga otomatis
    document.getElementById("penjualanHarga").value = hargaJual;

    // Tampilkan info stok
    showStokInfoPenjualan(currentStok, satuan);

    // Reset quantity dan hitung ulang total
    document.getElementById("penjualanQty").value = "";
    document.getElementById("penjualanTotal").value = "";
  } else {
    hideStokInfoPenjualan();
    document.getElementById("penjualanHarga").value = "";
    document.getElementById("penjualanTotal").value = "";
  }
}

function onQtyChangePenjualan() {
  const qty = parseFloat(document.getElementById("penjualanQty").value) || 0;
  const harga =
    parseFloat(document.getElementById("penjualanHarga").value) || 0;

  calculateTotalPenjualan(qty, harga);
  validateStokPenjualan(qty);
}

function onHargaChangePenjualan() {
  const qty = parseFloat(document.getElementById("penjualanQty").value) || 0;
  const harga =
    parseFloat(document.getElementById("penjualanHarga").value) || 0;

  calculateTotalPenjualan(qty, harga);
}

function calculateTotalPenjualan(qty, harga) {
  const total = qty * harga;
  document.getElementById("penjualanTotal").value = formatCurrency(total);
}

function validateStokPenjualan(qty) {
  const stokInfo = document.getElementById("stokInfo");
  const stokText = document.getElementById("stokText");

  if (qty > currentStok) {
    stokInfo.className = "alert alert-warning";
    stokText.textContent = `⚠️ Stok tidak mencukupi! Stok tersedia: ${currentStok} kg`;
    stokInfo.style.display = "block";

    // Disable submit button
    document.querySelector(
      '#formPenjualan button[type="submit"]'
    ).disabled = true;
  } else {
    stokInfo.className = "alert alert-info";
    stokText.textContent = `Stok tersedia: ${currentStok} kg`;
    stokInfo.style.display = "block";

    // Enable submit button
    document.querySelector(
      '#formPenjualan button[type="submit"]'
    ).disabled = false;
  }
}

function showStokInfoPenjualan(stok, satuan) {
  const stokInfo = document.getElementById("stokInfo");
  const stokText = document.getElementById("stokText");

  stokInfo.className = "alert alert-info";
  stokText.textContent = `Stok tersedia: ${stok} ${satuan}`;
  stokInfo.style.display = "block";
}

function hideStokInfoPenjualan() {
  const stokInfo = document.getElementById("stokInfo");
  if (stokInfo) {
    stokInfo.style.display = "none";
  }
}

async function simpanPenjualan() {
  // Validasi form
  if (!validateFormPenjualan()) {
    return;
  }

  const formData = getFormDataPenjualan();

  try {
    showAlert("Menyimpan data penjualan...", "info");

    await savePenjualanToSheet(formData);

    showAlert("Penjualan berhasil disimpan!", "success");
    resetFormPenjualan();

    // Reload data untuk update dashboard dan stok
    await system.loadAllData();
  } catch (error) {
    console.error("Error menyimpan penjualan:", error);
    throw error;
  }
}

function validateFormPenjualan() {
  const kodeBuah = document.getElementById("penjualanBuah").value;
  const qty = parseFloat(document.getElementById("penjualanQty").value);
  const harga = parseFloat(document.getElementById("penjualanHarga").value);

  if (!kodeBuah) {
    showAlert("Pilih buah terlebih dahulu", "warning");
    return false;
  }

  if (!qty || qty <= 0) {
    showAlert("Quantity harus lebih dari 0", "warning");
    return false;
  }

  if (!harga || harga <= 0) {
    showAlert("Harga harus lebih dari 0", "warning");
    return false;
  }

  // Validasi stok
  if (qty > currentStok) {
    showAlert(
      `Stok tidak mencukupi! Stok tersedia: ${currentStok} kg`,
      "warning"
    );
    return false;
  }

  return true;
}

function getFormDataPenjualan() {
  const kodeBuah = document.getElementById("penjualanBuah").value;
  const selectedBuah = system.masterData.buah.find((b) => b[0] === kodeBuah);
  const hargaBeli = selectedBuah ? parseFloat(selectedBuah[4]) : 0;

  return {
    tanggal: document.getElementById("penjualanTanggal").value,
    kodePelanggan:
      document.getElementById("penjualanPelanggan").value || "UMUM",
    kodeBuah: kodeBuah,
    quantity: parseFloat(document.getElementById("penjualanQty").value),
    hargaJual: parseFloat(document.getElementById("penjualanHarga").value),
    hargaBeli: hargaBeli,
    keterangan: document.getElementById("penjualanKeterangan").value,
  };
}

async function savePenjualanToSheet(data) {
  const noPenjualan = `SALE-${String(
    system.transactions.penjualan.length
  ).padStart(3, "0")}`;

  const rowData = [
    noPenjualan,
    data.tanggal,
    data.kodePelanggan,
    data.kodeBuah,
    data.quantity,
    data.hargaBeli,
    data.hargaJual,
    data.quantity * data.hargaBeli, // HPP
    data.quantity * data.hargaJual, // Total Penjualan
    data.quantity * data.hargaJual - data.quantity * data.hargaBeli, // Laba Kotor
    "LUNAS",
    data.keterangan || "",
  ];

  await appendToSheet(SHEETS.TRANSAKSI_PENJUALAN, rowData);
}

function resetFormPenjualan() {
  const form = document.getElementById("formPenjualan");
  if (form) {
    form.reset();

    // Set tanggal ke hari ini
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("penjualanTanggal").value = today;

    hideStokInfoPenjualan();

    // Enable submit button
    const submitButton = document.querySelector(
      '#formPenjualan button[type="submit"]'
    );
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

// ==================== UPDATE SYSTEM LOAD ALL DATA ====================
// Simpan reference ke fungsi original
const originalLoadAllData = system.loadAllData;

// Override dengan fungsi yang include penjualan
system.loadAllData = async function () {
  await originalLoadAllData.call(this);
  populatePenjualanDropdowns();
  populateBiayaDropdowns();
};

// ==================== BIAYA OPERASIONAL FUNCTIONS ====================
let currentBudget = 0;
let totalBiayaBulanIni = 0;

function setupBiayaForm() {
  console.log("Setup biaya form...");

  // Event untuk perubahan jenis biaya
  const biayaJenis = document.getElementById("biayaJenis");
  if (biayaJenis) {
    console.log("Menambahkan event listener untuk biayaJenis");
    biayaJenis.addEventListener("change", function (e) {
      console.log(
        "Perubahan pada select jenis biaya terdeteksi, value:",
        e.target.value
      );
      onJenisBiayaChange(e.target.value);
    });
  }

  // Event untuk perubahan jumlah biaya
  const biayaJumlah = document.getElementById("biayaJumlah");
  if (biayaJumlah) {
    console.log("Menambahkan event listener untuk biayaJumlah");
    biayaJumlah.addEventListener("input", function () {
      onJumlahBiayaChange();
    });
  }

  // Event submit form
  const formBiaya = document.getElementById("formBiaya");
  if (formBiaya) {
    formBiaya.addEventListener("submit", async function (e) {
      e.preventDefault();
      await simpanBiaya();
    });
  }

  console.log("Setup biaya form selesai");
}

function populateBiayaDropdowns() {
  populateJenisBiayaDropdown();
  calculateTotalBiayaBulanIni();
}

function populateJenisBiayaDropdown() {
  const select = document.getElementById("biayaJenis");
  if (!select) {
    console.error("Element biayaJenis tidak ditemukan!");
    return;
  }

  console.log("Memulai populateJenisBiayaDropdown...");
  console.log("Data biaya system:", system.masterData.biaya);
  console.log(
    "Jumlah data biaya:",
    system.masterData.biaya ? system.masterData.biaya.length : 0
  );

  select.innerHTML = '<option value="">Pilih Jenis Biaya</option>';

  if (!system.masterData.biaya || system.masterData.buah.length <= 1) {
    console.log("Tidak ada data jenis biaya atau hanya header");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tidak ada data jenis biaya";
    option.disabled = true;
    select.appendChild(option);
    return;
  }

  let jumlahOptionDitambahkan = 0;

  // Loop melalui data biaya (skip header)
  system.masterData.biaya.slice(1).forEach((biaya, index) => {
    console.log(`Data biaya [${index}]:`, biaya);

    if (!biaya || biaya.length < 2) {
      console.warn("Data biaya tidak lengkap:", biaya);
      return;
    }

    const kode = biaya[0] || "";
    const nama = biaya[1] || "";
    const kategori = biaya[2] || "Umum";
    const sub_kategori = biaya[3] || "Lainnya";
    const budget = biaya[4] || "0";
    const status = biaya[5] || "";

    console.log(
      `Processing: ${kode} - ${nama}, Status: ${status}, Budget: ${budget}`
    );

    // Filter yang lebih fleksibel untuk status
    const statusLower = status.toString().toLowerCase();
    const isActive =
      statusLower === "active" ||
      statusLower === "aktif" ||
      statusLower === "yes" ||
      statusLower === "y" ||
      statusLower === "true" ||
      status === ""; // Jika kosong, anggap aktif

    if (isActive) {
      const option = document.createElement("option");
      option.value = kode;
      option.textContent = `${nama} (${kategori} - ${sub_kategori}) - Budget: ${formatCurrency(
        parseFloat(budget) || 0
      )}`;
      option.setAttribute("data-budget", budget);
      option.setAttribute("data-kategori", kategori);
      option.setAttribute("data-subkategori", sub_kategori);
      select.appendChild(option);
      jumlahOptionDitambahkan++;
      console.log(`✓ Menambahkan option untuk ${nama}`);
    } else {
      console.log(`✗ Skip ${nama} karena status: ${status}`);
    }
  });

  console.log(
    `Selesai populateJenisBiayaDropdown, jumlah option ditambahkan: ${jumlahOptionDitambahkan}`
  );

  // Jika tidak ada biaya yang aktif
  if (jumlahOptionDitambahkan === 0) {
    console.log("Tidak ada jenis biaya yang aktif");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Tidak ada jenis biaya yang aktif";
    option.disabled = true;
    select.appendChild(option);
  }
}

function calculateTotalBiayaBulanIni() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  totalBiayaBulanIni = system.transactions.operasional
    .slice(1)
    .filter((t) => {
      const date = new Date(t[1]);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    })
    .reduce((sum, t) => sum + parseFloat(t[3]), 0);

  console.log("Total biaya bulan ini:", totalBiayaBulanIni);
}

function onJenisBiayaChange(kodeBiaya) {
  console.log("onJenisBiayaChange dipanggil, kodeBiaya:", kodeBiaya);

  const select = document.getElementById("biayaJenis");
  if (!select) {
    console.error("Element biayaJenis tidak ditemukan!");
    return;
  }

  const selectedOption = select.options[select.selectedIndex];
  console.log("Selected option:", selectedOption);

  if (kodeBiaya && selectedOption) {
    currentBudget = parseFloat(selectedOption.getAttribute("data-budget")) || 0;
    const kategori = selectedOption.getAttribute("data-kategori") || "";
    const subkategori = selectedOption.getAttribute("data-subkategori") || "";

    console.log(
      "Data dari option - budget:",
      currentBudget,
      "kategori:",
      kategori,
      "subkategori:",
      subkategori
    );

    // Tampilkan info budget
    showBudgetInfo(currentBudget, totalBiayaBulanIni);
  } else {
    console.log("Tidak ada jenis biaya yang dipilih atau option tidak valid");
    hideBudgetInfo();
  }
}

function onJumlahBiayaChange() {
  const jumlah = parseFloat(document.getElementById("biayaJumlah").value) || 0;
  validateBudget(jumlah);
}

function showBudgetInfo(budget, totalBulanIni) {
  console.log(
    "showBudgetInfo dipanggil, budget:",
    budget,
    "totalBulanIni:",
    totalBulanIni
  );

  const budgetInfo = document.getElementById("budgetInfo");
  const budgetText = document.getElementById("budgetText");

  console.log("budgetInfo element:", budgetInfo);
  console.log("budgetText element:", budgetText);

  if (!budgetInfo || !budgetText) {
    console.error("Element budgetInfo atau budgetText tidak ditemukan!");
    return;
  }

  const sisaBudget = budget - totalBulanIni;
  const persentaseTerpakai = budget > 0 ? (totalBulanIni / budget) * 100 : 0;

  let statusClass = "alert-info";
  let statusIcon = "ℹ️";

  if (persentaseTerpakai > 80) {
    statusClass = "alert-warning";
    statusIcon = "⚠️";
  }
  if (persentaseTerpakai >= 100) {
    statusClass = "alert-danger";
    statusIcon = "🚨";
  }

  budgetInfo.className = `alert ${statusClass}`;
  budgetText.innerHTML = `
        ${statusIcon} Budget: ${formatCurrency(budget)} | 
        Terpakai: ${formatCurrency(totalBulanIni)} | 
        Sisa: ${formatCurrency(sisaBudget)} |
        (${persentaseTerpakai.toFixed(1)}% terpakai)
    `;
  budgetInfo.style.display = "block";

  console.log("Budget info seharusnya muncul sekarang");
}

function hideBudgetInfo() {
  const budgetInfo = document.getElementById("budgetInfo");
  if (budgetInfo) {
    budgetInfo.style.display = "none";
  }
}

function validateBudget(jumlah) {
  const budgetInfo = document.getElementById("budgetInfo");
  const budgetText = document.getElementById("budgetText");

  if (!budgetInfo || !budgetText) return;

  const totalSetelahIni = totalBiayaBulanIni + jumlah;
  const persentaseSetelahIni =
    currentBudget > 0 ? (totalSetelahIni / currentBudget) * 100 : 0;

  let statusClass = "alert-info";
  let statusIcon = "ℹ️";
  let warningText = "";

  if (persentaseSetelahIni > 80) {
    statusClass = "alert-warning";
    statusIcon = "⚠️";
    warningText = " - Mendekati limit budget!";
  }
  if (persentaseSetelahIni >= 100) {
    statusClass = "alert-danger";
    statusIcon = "🚨";
    warningText = " - BUDGET TERLEBIH!";
  }

  budgetInfo.className = `alert ${statusClass}`;
  budgetText.innerHTML = `
        ${statusIcon} Budget: ${formatCurrency(currentBudget)} | 
        Terpakai: ${formatCurrency(totalBiayaBulanIni)} | 
        + Biaya ini: ${formatCurrency(jumlah)} |
        Total: ${formatCurrency(totalSetelahIni)} 
        ${warningText}
    `;
}

async function simpanBiaya() {
  if (!isAuthenticated) {
    showAlert(
      "Silakan login terlebih dahulu untuk menambah data biaya",
      "warning"
    );
    return;
  }

  // Validasi form
  if (!validateFormBiaya()) {
    return;
  }

  const formData = getFormDataBiaya();

  try {
    showAlert("Menyimpan data biaya...", "info");

    await saveBiayaToSheet(formData);

    showAlert("Biaya operasional berhasil disimpan!", "success");
    resetFormBiaya();

    // Reload data untuk update dashboard
    await system.loadAllData();
  } catch (error) {
    console.error("Error menyimpan biaya:", error);
    showAlert("Gagal menyimpan biaya: " + error.message, "danger");
  }
}

function validateFormBiaya() {
  const kodeBiaya = document.getElementById("biayaJenis").value;
  const jumlah = parseFloat(document.getElementById("biayaJumlah").value);

  if (!kodeBiaya) {
    showAlert("Pilih jenis biaya terlebih dahulu", "warning");
    return false;
  }

  if (!jumlah || jumlah <= 0) {
    showAlert("Jumlah biaya harus lebih dari 0", "warning");
    return false;
  }

  // Validasi budget (opsional, bisa di-comment jika tidak diperlukan)
  const totalSetelahIni = totalBiayaBulanIni + jumlah;
  if (currentBudget > 0 && totalSetelahIni > currentBudget) {
    const konfirmasi = confirm(
      `⚠️ PERINGATAN!\n\nTotal biaya akan melebihi budget!\n\n` +
        `Budget: ${formatCurrency(currentBudget)}\n` +
        `Terpakai: ${formatCurrency(totalBiayaBulanIni)}\n` +
        `Biaya ini: ${formatCurrency(jumlah)}\n` +
        `Total: ${formatCurrency(totalSetelahIni)}\n\n` +
        `Lanjutkan menyimpan?`
    );

    if (!konfirmasi) {
      return false;
    }
  }

  return true;
}

function getFormDataBiaya() {
  const kodeBiaya = document.getElementById("biayaJenis").value;
  const selectedBiaya = system.masterData.biaya.find((b) => b[0] === kodeBiaya);
  const namaBiaya = selectedBiaya ? selectedBiaya[1] : "";

  return {
    tanggal: document.getElementById("biayaTanggal").value,
    kodeBiaya: kodeBiaya,
    namaBiaya: namaBiaya,
    jumlah: parseFloat(document.getElementById("biayaJumlah").value),
    status: document.getElementById("biayaStatus").value,
    keterangan: document.getElementById("biayaKeterangan").value,
  };
}

async function saveBiayaToSheet(data) {
  const noBiaya = `BIAYA-${String(
    system.transactions.operasional.length
  ).padStart(3, "0")}`;

  const rowData = [
    noBiaya,
    data.tanggal,
    data.kodeBiaya,
    data.jumlah,
    data.status,
    data.keterangan || "",
  ];

  await appendToSheet(SHEETS.TRANSAKSI_OPERASIONAL, rowData);
}

function resetFormBiaya() {
  const form = document.getElementById("formBiaya");
  if (form) {
    form.reset();

    // Set tanggal ke hari ini dan status ke LUNAS
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("biayaTanggal").value = today;
    document.getElementById("biayaStatus").value = "LUNAS";

    hideBudgetInfo();
  }
}

// Export functions for global access
window.generateLaporan = generateLaporan;
window.system = system;
window.login = login;
window.logout = logout;
window.showModal = showModal;
window.saveMasterData = saveMasterData;
window.editMasterData = editMasterData;
window.deleteMasterData = deleteMasterData;
window.resetFormPenjualan = resetFormPenjualan;
window.resetFormBiaya = resetFormBiaya;
