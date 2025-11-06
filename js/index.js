// ==================== CONFIGURATION ====================
// Ganti dengan URL Web App Anda setelah deploy
const WEB_APP_URL =
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";

const SHEETS = {
  MASTER_BUAH: "master_buah",
  MASTER_SUPPLIER: "master_supplier",
  MASTER_PELANGGAN: "master_pelanggan",
  MASTER_BIAYA: "master_jenis_biaya",
  TRANSAKSI_PEMBELIAN: "transaksi_pembelian",
  TRANSAKSI_PENJUALAN: "transaksi_penjualan",
  TRANSAKSI_OPERASIONAL: "transaksi_operasional",
};

// ==================== WEB APP API FUNCTIONS ====================
async function getSheetData(sheetName) {
  try {
    const url = `${WEB_APP_URL}?action=getData&sheet=${sheetName}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result.data || [];
  } catch (error) {
    console.error("Error fetching data:", error);
    throw new Error(`Gagal mengambil data dari ${sheetName}: ${error.message}`);
  }
}

async function appendToSheet(sheetName, data) {
  try {
    const url = `${WEB_APP_URL}?action=appendData&sheet=${sheetName}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  } catch (error) {
    console.error("Error appending data:", error);
    throw new Error(`Gagal menyimpan data ke ${sheetName}: ${error.message}`);
  }
}

// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

function showAlert(message, type = "success") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  const container = document.querySelector(".container-fluid");
  const tabContent = document.querySelector(".tab-content");

  if (container && tabContent) {
    container.insertBefore(alertDiv, tabContent);
  } else {
    document.body.insertBefore(alertDiv, document.body.firstChild);
  }

  setTimeout(() => {
    if (alertDiv.parentElement) alertDiv.remove();
  }, 5000);
}

// ==================== CORE BUSINESS LOGIC ====================
class TokoBuahSystem {
  constructor() {
    this.masterData = {};
    this.transactions = {};
    this.isLoading = false;
  }

  async loadAllData() {
    if (this.isLoading) {
      console.log("Data sedang dimuat...");
      return;
    }

    this.isLoading = true;

    try {
      showAlert("Memuat data...", "info");

      // Load master data
      this.masterData.buah = await getSheetData(SHEETS.MASTER_BUAH);
      this.masterData.supplier = await getSheetData(SHEETS.MASTER_SUPPLIER);
      this.masterData.pelanggan = await getSheetData(SHEETS.MASTER_PELANGGAN);
      this.masterData.biaya = await getSheetData(SHEETS.MASTER_BIAYA);

      // Load transactions
      this.transactions.pembelian = await getSheetData(
        SHEETS.TRANSAKSI_PEMBELIAN
      );
      this.transactions.penjualan = await getSheetData(
        SHEETS.TRANSAKSI_PENJUALAN
      );
      this.transactions.operasional = await getSheetData(
        SHEETS.TRANSAKSI_OPERASIONAL
      );

      this.updateDashboard();
      this.updateMasterTables();
      this.populateDropdowns();

      showAlert("Data berhasil dimuat!", "success");
    } catch (error) {
      console.error("Error loading data:", error);
      showAlert("Error memuat data: " + error.message, "danger");
    } finally {
      this.isLoading = false;
    }
  }

  calculateCurrentStock(kodeBuah) {
    const pembelian = this.transactions.pembelian
      .slice(1)
      .filter((t) => t[3] === kodeBuah);
    const penjualan = this.transactions.penjualan
      .slice(1)
      .filter((t) => t[3] === kodeBuah);

    const totalPembelian = pembelian.reduce(
      (sum, t) => sum + parseFloat(t[4] || 0),
      0
    );
    const totalPenjualan = penjualan.reduce(
      (sum, t) => sum + parseFloat(t[4] || 0),
      0
    );

    return totalPembelian - totalPenjualan;
  }

  updateDashboard() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate monthly income/expense
    const penjualanBulanIni = this.transactions.penjualan
      .slice(1)
      .filter((t) => {
        const date = new Date(t[1]);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + parseFloat(t[9] || 0), 0);

    const pembelianBulanIni = this.transactions.pembelian
      .slice(1)
      .filter((t) => {
        const date = new Date(t[1]);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + parseFloat(t[6] || 0), 0);

    const biayaBulanIni = this.transactions.operasional
      .slice(1)
      .filter((t) => {
        const date = new Date(t[1]);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + parseFloat(t[3] || 0), 0);

    const totalPendapatan = document.getElementById("totalPendapatan");
    const totalPengeluaran = document.getElementById("totalPengeluaran");
    const labaBersih = document.getElementById("labaBersih");
    const totalTransaksi = document.getElementById("totalTransaksi");

    if (totalPendapatan)
      totalPendapatan.textContent = formatCurrency(penjualanBulanIni);
    if (totalPengeluaran)
      totalPengeluaran.textContent = formatCurrency(
        pembelianBulanIni + biayaBulanIni
      );
    if (labaBersih)
      labaBersih.textContent = formatCurrency(
        penjualanBulanIni - pembelianBulanIni - biayaBulanIni
      );
    if (totalTransaksi)
      totalTransaksi.textContent =
        this.transactions.penjualan.length -
        1 +
        this.transactions.pembelian.length -
        1;

    this.updateStockAlerts();
    this.updateRecentTransactions();
  }

  updateStockAlerts() {
    const alertsContainer = document.getElementById("stockAlerts");
    if (!alertsContainer) return;

    alertsContainer.innerHTML = "";

    this.masterData.buah.slice(1).forEach((buah) => {
      const [kode, nama, , , , , stokMin] = buah;
      const currentStock = this.calculateCurrentStock(kode);

      if (currentStock <= parseFloat(stokMin || 0)) {
        const alertDiv = document.createElement("div");
        alertDiv.className = "alert alert-warning";
        alertDiv.innerHTML = `
          <strong>${nama}</strong>: Stok ${currentStock} kg (Min: ${stokMin} kg)
        `;
        alertsContainer.appendChild(alertDiv);
      }
    });

    if (alertsContainer.children.length === 0) {
      alertsContainer.innerHTML =
        '<div class="text-center text-muted">Semua stok aman</div>';
    }
  }

  updateRecentTransactions() {
    const container = document.getElementById("recentTransactions");
    if (!container) return;

    container.innerHTML = "";

    const allTransactions = [
      ...this.transactions.pembelian
        .slice(1)
        .map((t) => ({ ...t, type: "PEMBELIAN" })),
      ...this.transactions.penjualan
        .slice(1)
        .map((t) => ({ ...t, type: "PENJUALAN" })),
      ...this.transactions.operasional
        .slice(1)
        .map((t) => ({ ...t, type: "BIAYA" })),
    ]
      .sort((a, b) => new Date(b[1]) - new Date(a[1]))
      .slice(0, 5);

    allTransactions.forEach((trans) => {
      const row = document.createElement("tr");
      let description = "";
      let amount = 0;

      if (trans.type === "PEMBELIAN") {
        const buah = this.masterData.buah.find((b) => b[0] === trans[3]);
        description = `Pembelian ${buah ? buah[1] : trans[3]}`;
        amount = -parseFloat(trans[6] || 0);
      } else if (trans.type === "PENJUALAN") {
        const buah = this.masterData.buah.find((b) => b[0] === trans[3]);
        description = `Penjualan ${buah ? buah[1] : trans[3]}`;
        amount = parseFloat(trans[9] || 0);
      } else {
        const biaya = this.masterData.biaya.find((b) => b[0] === trans[2]);
        description = `Biaya ${biaya ? biaya[1] : trans[2]}`;
        amount = -parseFloat(trans[3] || 0);
      }

      row.innerHTML = `
        <td>${trans[1]}</td>
        <td><span class="badge ${
          trans.type === "PENJUALAN" ? "bg-success" : "bg-warning"
        }">${trans.type}</span></td>
        <td>${description}</td>
        <td class="${
          amount >= 0 ? "text-success" : "text-danger"
        }">${formatCurrency(Math.abs(amount))}</td>
      `;
      container.appendChild(row);
    });
  }

  updateMasterTables() {
    const tableBuah = document.getElementById("tableMasterBuah");
    if (!tableBuah) return;

    tableBuah.innerHTML = "";

    this.masterData.buah.slice(1).forEach((buah, index) => {
      const [
        kode,
        nama,
        kategori,
        satuan,
        hargaBeli,
        hargaJual,
        stokMin,
        status,
      ] = buah;
      const currentStock = this.calculateCurrentStock(kode);

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${kode}</td>
        <td>${nama}</td>
        <td>${kategori}</td>
        <td>${satuan}</td>
        <td>${formatCurrency(parseFloat(hargaBeli || 0))}</td>
        <td>${formatCurrency(parseFloat(hargaJual || 0))}</td>
        <td>${stokMin} ${satuan}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editMasterData('buah', ${index})">
            <i class="bi bi-pencil"></i> Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('buah', ${index})">
            <i class="bi bi-trash"></i> Hapus
          </button>
        </td>
      `;
      tableBuah.appendChild(row);
    });
  }

  populateDropdowns() {
    // Populate supplier dropdown
    const supplierSelect = document.getElementById("pembelianSupplier");
    if (supplierSelect) {
      supplierSelect.innerHTML = '<option value="">Pilih Supplier</option>';
      this.masterData.supplier.slice(1).forEach((supplier) => {
        const option = document.createElement("option");
        option.value = supplier[0];
        option.textContent = supplier[1];
        supplierSelect.appendChild(option);
      });
    }

    // Populate buah dropdown
    const buahSelect = document.getElementById("pembelianBuah");
    if (buahSelect) {
      buahSelect.innerHTML = '<option value="">Pilih Buah</option>';
      this.masterData.buah.slice(1).forEach((buah) => {
        const option = document.createElement("option");
        option.value = buah[0];
        option.textContent = `${buah[1]} (Stok: ${this.calculateCurrentStock(
          buah[0]
        ).toFixed(1)} kg)`;
        option.setAttribute("data-harga", buah[4]);
        buahSelect.appendChild(option);
      });
    }
  }

  async simpanPembelian(data) {
    const noPembelian = `PO-${String(
      this.transactions.pembelian.length
    ).padStart(3, "0")}`;
    const rowData = [
      noPembelian,
      data.tanggal,
      data.kodeSupplier,
      data.kodeBuah,
      data.quantity,
      data.hargaBeli,
      data.quantity * data.hargaBeli,
      "LUNAS",
      data.keterangan,
    ];

    await appendToSheet(SHEETS.TRANSAKSI_PEMBELIAN, rowData);
    await this.loadAllData();
  }

  async generateLaporanLabaRugi(startDate, endDate) {
    const penjualan = this.transactions.penjualan.slice(1).filter((t) => {
      const date = new Date(t[1]);
      return date >= startDate && date <= endDate;
    });

    const pembelian = this.transactions.pembelian.slice(1).filter((t) => {
      const date = new Date(t[1]);
      return date >= startDate && date <= endDate;
    });

    const biaya = this.transactions.operasional.slice(1).filter((t) => {
      const date = new Date(t[1]);
      return date >= startDate && date <= endDate;
    });

    const totalPenjualan = penjualan.reduce(
      (sum, t) => sum + parseFloat(t[6] || 0),
      0
    );
    const totalPembelian = pembelian.reduce(
      (sum, t) => sum + parseFloat(t[6] || 0),
      0
    );
    const totalBiaya = biaya.reduce((sum, t) => sum + parseFloat(t[3] || 0), 0);

    const labaKotor = totalPenjualan - totalPembelian;
    const labaBersih = labaKotor - totalBiaya;

    return {
      totalPenjualan,
      totalPembelian,
      totalBiaya,
      labaKotor,
      labaBersih,
    };
  }
}

// ==================== MODAL MANAGEMENT ====================
let currentMasterType = "";
let editingData = null;

function showModal(masterType, data = null) {
  currentMasterType = masterType;
  editingData = data;

  document.querySelectorAll("#masterModal form").forEach((form) => {
    form.style.display = "none";
  });

  document
    .querySelectorAll(
      "#masterModal input, #masterModal select, #masterModal textarea"
    )
    .forEach((input) => {
      input.value = "";
    });

  let modalTitle = "";
  switch (masterType) {
    case "buah":
      const formBuah = document.getElementById("formMasterBuah");
      if (formBuah) formBuah.style.display = "block";
      modalTitle = data ? "Edit Data Buah" : "Tambah Data Buah";
      if (data) {
        populateBuahForm(data);
      } else {
        generateAutoKode("buah");
      }
      break;
    case "supplier":
      const formSupplier = document.getElementById("formMasterSupplier");
      if (formSupplier) formSupplier.style.display = "block";
      modalTitle = data ? "Edit Data Supplier" : "Tambah Data Supplier";
      if (data) {
        populateSupplierForm(data);
      } else {
        generateAutoKode("supplier");
      }
      break;
    case "pelanggan":
      const formPelanggan = document.getElementById("formMasterPelanggan");
      if (formPelanggan) formPelanggan.style.display = "block";
      modalTitle = data ? "Edit Data Pelanggan" : "Tambah Data Pelanggan";
      if (data) {
        populatePelangganForm(data);
      } else {
        generateAutoKode("pelanggan");
      }
      break;
    case "biaya":
      const formBiaya = document.getElementById("formMasterBiaya");
      if (formBiaya) formBiaya.style.display = "block";
      modalTitle = data ? "Edit Data Biaya" : "Tambah Data Biaya";
      if (data) {
        populateBiayaForm(data);
      } else {
        generateAutoKode("biaya");
      }
      break;
  }

  const modalTitleEl = document.getElementById("masterModalTitle");
  if (modalTitleEl) modalTitleEl.textContent = modalTitle;

  const modalEl = document.getElementById("masterModal");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function generateAutoKode(type) {
  const prefixes = {
    buah: "BUAH",
    supplier: "SUP",
    pelanggan: "CUST",
    biaya: "BIAYA",
  };

  const prefix = prefixes[type];
  const existingData = system.masterData[type] || [];
  const nextNumber = existingData.length;

  const kodeInput = document.getElementById(`${type}Kode`);
  if (kodeInput) {
    kodeInput.value = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  }
}

function populateBuahForm(data) {
  const fields = [
    "Kode",
    "Nama",
    "Kategori",
    "Satuan",
    "HargaBeli",
    "HargaJual",
    "StokMin",
    "Status",
  ];
  fields.forEach((field, index) => {
    const el = document.getElementById(`buah${field}`);
    if (el) el.value = data[index] || "";
  });
}

function populateSupplierForm(data) {
  const fields = ["Kode", "Nama", "Kontak", "Alamat", "JenisBuah", "Terms"];
  fields.forEach((field, index) => {
    const el = document.getElementById(`supplier${field}`);
    if (el) el.value = data[index] || "";
  });
}

function populatePelangganForm(data) {
  const fields = ["Kode", "Nama", "Jenis", "Kontak", "Alamat", "Limit"];
  fields.forEach((field, index) => {
    const el = document.getElementById(`pelanggan${field}`);
    if (el) el.value = data[index] || "";
  });
}

function populateBiayaForm(data) {
  const fields = [
    "Kode",
    "Nama",
    "Kategori",
    "SubKategori",
    "Budget",
    "Status",
  ];
  fields.forEach((field, index) => {
    const el = document.getElementById(`biaya${field}`);
    if (el) el.value = data[index] || "";
  });
}

async function saveMasterData() {
  try {
    let data = [];
    const sheetName = getSheetNameByType(currentMasterType);

    switch (currentMasterType) {
      case "buah":
        data = [
          document.getElementById("buahKode").value,
          document.getElementById("buahNama").value,
          document.getElementById("buahKategori").value,
          document.getElementById("buahSatuan").value,
          parseFloat(document.getElementById("buahHargaBeli").value),
          parseFloat(document.getElementById("buahHargaJual").value),
          parseFloat(document.getElementById("buahStokMin").value),
          document.getElementById("buahStatus").value,
        ];
        break;
      case "supplier":
        data = [
          document.getElementById("supplierKode").value,
          document.getElementById("supplierNama").value,
          document.getElementById("supplierKontak").value,
          document.getElementById("supplierAlamat").value,
          document.getElementById("supplierJenisBuah").value,
          document.getElementById("supplierTerms").value,
        ];
        break;
      case "pelanggan":
        data = [
          document.getElementById("pelangganKode").value,
          document.getElementById("pelangganNama").value,
          document.getElementById("pelangganJenis").value,
          document.getElementById("pelangganKontak").value,
          document.getElementById("pelangganAlamat").value,
          parseFloat(document.getElementById("pelangganLimit").value),
        ];
        break;
      case "biaya":
        data = [
          document.getElementById("biayaKode").value,
          document.getElementById("biayaNama").value,
          document.getElementById("biayaKategori").value,
          document.getElementById("biayaSubKategori").value,
          parseFloat(document.getElementById("biayaBudget").value),
          document.getElementById("biayaStatus").value,
        ];
        break;
    }

    await appendToSheet(sheetName, data);
    await system.loadAllData();

    const modalEl = document.getElementById("masterModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }

    showAlert(
      `Data ${currentMasterType} berhasil ${
        editingData ? "diupdate" : "disimpan"
      }!`,
      "success"
    );
  } catch (error) {
    showAlert(`Error menyimpan data: ${error.message}`, "danger");
  }
}

function getSheetNameByType(masterType) {
  const mapping = {
    buah: SHEETS.MASTER_BUAH,
    supplier: SHEETS.MASTER_SUPPLIER,
    pelanggan: SHEETS.MASTER_PELANGGAN,
    biaya: SHEETS.MASTER_BIAYA,
  };
  return mapping[masterType];
}

function editMasterData(type, index) {
  const data = system.masterData[type][index + 1];
  showModal(type, data);
}

async function deleteMasterData(type, index) {
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    showAlert(
      "Fitur delete membutuhkan implementasi Google Sheets API yang lebih kompleks",
      "warning"
    );
  }
}

// ==================== REPORT GENERATION ====================
async function generateLaporan() {
  const startDate = new Date(document.getElementById("reportStartDate").value);
  const endDate = new Date(document.getElementById("reportEndDate").value);

  try {
    const laporan = await system.generateLaporanLabaRugi(startDate, endDate);

    const labaRugiContainer = document.getElementById("laporanLabaRugi");
    if (labaRugiContainer) {
      labaRugiContainer.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <table class="table table-bordered">
              <tr>
                <th>Pendapatan Penjualan</th>
                <td class="text-end">${formatCurrency(
                  laporan.totalPenjualan
                )}</td>
              </tr>
              <tr>
                <th>Harga Pokok Penjualan</th>
                <td class="text-end">${formatCurrency(
                  laporan.totalPembelian
                )}</td>
              </tr>
              <tr class="table-success">
                <th><strong>Laba Kotor</strong></th>
                <td class="text-end"><strong>${formatCurrency(
                  laporan.labaKotor
                )}</strong></td>
              </tr>
              <tr>
                <th>Biaya Operasional</th>
                <td class="text-end">${formatCurrency(laporan.totalBiaya)}</td>
              </tr>
              <tr class="table-primary">
                <th><strong>LABA BERSIH</strong></th>
                <td class="text-end"><strong>${formatCurrency(
                  laporan.labaBersih
                )}</strong></td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }

    await generateLaporanStok();
  } catch (error) {
    showAlert("Error generating report: " + error.message, "danger");
  }
}

async function generateLaporanStok() {
  const stokContainer = document.getElementById("laporanStok");
  if (!stokContainer) return;

  stokContainer.innerHTML = "";

  system.masterData.buah.slice(1).forEach((buah) => {
    const [kode, nama] = buah;
    const currentStock = system.calculateCurrentStock(kode);

    const totalPembelian = system.transactions.pembelian
      .slice(1)
      .filter((t) => t[3] === kode)
      .reduce((sum, t) => sum + parseFloat(t[4] || 0), 0);

    const totalPenjualan = system.transactions.penjualan
      .slice(1)
      .filter((t) => t[3] === kode)
      .reduce((sum, t) => sum + parseFloat(t[4] || 0), 0);

    const hargaBeli = parseFloat(buah[4] || 0);
    const nilaiPersediaan = currentStock * hargaBeli;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${nama}</td>
      <td>0 kg</td>
      <td>${totalPembelian.toFixed(1)} kg</td>
      <td>${totalPenjualan.toFixed(1)} kg</td>
      <td><strong>${currentStock.toFixed(1)} kg</strong></td>
      <td>${formatCurrency(nilaiPersediaan)}</td>
    `;
    stokContainer.appendChild(row);
  });
}

// ==================== INITIALIZATION ====================
const system = new TokoBuahSystem();

document.addEventListener("DOMContentLoaded", function () {
  const now = new Date();

  const pembelianTanggal = document.getElementById("pembelianTanggal");
  if (pembelianTanggal) pembelianTanggal.valueAsDate = now;

  const reportStartDate = document.getElementById("reportStartDate");
  if (reportStartDate)
    reportStartDate.valueAsDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  const reportEndDate = document.getElementById("reportEndDate");
  if (reportEndDate) reportEndDate.valueAsDate = now;

  function updateDateTime() {
    const currentDateTime = document.getElementById("currentDateTime");
    if (currentDateTime) {
      currentDateTime.textContent = new Date().toLocaleString("id-ID");
    }
  }
  setInterval(updateDateTime, 1000);
  updateDateTime();

  system.loadAllData();

  const formPembelian = document.getElementById("formPembelian");
  if (formPembelian) {
    formPembelian.addEventListener("submit", async function (e) {
      e.preventDefault();

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

  const pembelianBuah = document.getElementById("pembelianBuah");
  if (pembelianBuah) {
    pembelianBuah.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      const harga = selectedOption.getAttribute("data-harga");
      const pembelianHarga = document.getElementById("pembelianHarga");
      if (harga && pembelianHarga) {
        pembelianHarga.value = harga;
      }
    });
  }
});

window.generateLaporan = generateLaporan;
window.system = system;
window.showModal = showModal;
window.saveMasterData = saveMasterData;
window.editMasterData = editMasterData;
window.deleteMasterData = deleteMasterData;
