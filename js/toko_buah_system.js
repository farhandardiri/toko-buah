// ==================== TOKO BUAH SYSTEM ====================
class TokoBuahSystem {
  constructor() {
    this.masterData = {};
    this.transactions = {};
  }

  async loadAllData() {
    try {
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
    } catch (error) {
      console.error("Error loading data:", error);
      showAlert("Error memuat data: " + error.message, "danger");
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
      (sum, t) => sum + parseFloat(t[4]),
      0
    );
    const totalPenjualan = penjualan.reduce(
      (sum, t) => sum + parseFloat(t[4]),
      0
    );

    return totalPembelian - totalPenjualan;
  }

  updateDashboard() {
    // Update summary cards
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
      .reduce((sum, t) => sum + parseFloat(t[9]), 0);

    const pembelianBulanIni = this.transactions.pembelian
      .slice(1)
      .filter((t) => {
        const date = new Date(t[1]);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + parseFloat(t[6]), 0);

    const biayaBulanIni = this.transactions.operasional
      .slice(1)
      .filter((t) => {
        const date = new Date(t[1]);
        return (
          date.getMonth() === currentMonth && date.getFullYear() === currentYear
        );
      })
      .reduce((sum, t) => sum + parseFloat(t[3]), 0);

    document.getElementById("totalPendapatan").textContent =
      formatCurrency(penjualanBulanIni);
    document.getElementById("totalPengeluaran").textContent = formatCurrency(
      pembelianBulanIni + biayaBulanIni
    );
    document.getElementById("labaBersih").textContent = formatCurrency(
      penjualanBulanIni - pembelianBulanIni - biayaBulanIni
    );
    document.getElementById("totalTransaksi").textContent =
      this.transactions.penjualan.length -
      1 +
      this.transactions.pembelian.length -
      1;

    // Update stock alerts
    this.updateStockAlerts();

    // Update recent transactions
    this.updateRecentTransactions();
  }

  updateStockAlerts() {
    const alertsContainer = document.getElementById("stockAlerts");
    if (!alertsContainer) return;

    alertsContainer.innerHTML = "";

    this.masterData.buah.slice(1).forEach((buah) => {
      const [kode, nama, , , , , stokMin] = buah;
      const currentStock = this.calculateCurrentStock(kode);

      if (currentStock <= parseFloat(stokMin)) {
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

    // Combine and sort recent transactions
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
        amount = -parseFloat(trans[6]);
      } else if (trans.type === "PENJUALAN") {
        const buah = this.masterData.buah.find((b) => b[0] === trans[3]);
        description = `Penjualan ${buah ? buah[1] : trans[3]}`;
        amount = parseFloat(trans[9]);
      } else {
        const biaya = this.masterData.biaya.find((b) => b[0] === trans[2]);
        description = `Biaya ${biaya ? biaya[1] : trans[2]}`;
        amount = -parseFloat(trans[3]);
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
    console.log("Memulai update master tables...");

    // Update master buah table
    this.updateMasterBuahTable();

    // Update master supplier table
    this.updateMasterSupplierTable();

    // Update master lainnya jika ada
    this.updateMasterPelangganTable();
    this.updateMasterBiayaTable();
  }

  updateMasterBuahTable() {
    const tableBuah = document.getElementById("tableMasterBuah");
    if (!tableBuah) {
      console.error("Element tableMasterBuah tidak ditemukan!");
      return;
    }

    console.log("Data buah:", this.masterData.buah);

    tableBuah.innerHTML = "";

    // Cek apakah ada data buah
    if (!this.masterData.buah || this.masterData.buah.length <= 1) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="10" class="text-center text-muted">Tidak ada data buah</td>`;
      tableBuah.appendChild(row);
      return;
    }

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
            <td>${kode || "-"}</td>
            <td>${nama || "-"}</td>
            <td>${kategori || "-"}</td>
            <td>${satuan || "-"}</td>
            <td>${formatCurrency(parseFloat(hargaBeli) || 0)}</td>
            <td>${formatCurrency(parseFloat(hargaJual) || 0)}</td>
            <td>${stokMin || 0} ${satuan || ""}</td>
            <td>${currentStock.toFixed(1)} ${satuan || ""}</td>
            <td>${status || "Aktif"}</td>
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

  updateMasterSupplierTable() {
    const tableSupplier = document.getElementById("tableMasterSupplier");
    if (!tableSupplier) {
      console.error("Element tableMasterSupplier tidak ditemukan!");
      console.log(
        "Available elements:",
        document.querySelectorAll('[id*="supplier"]')
      );
      return;
    }

    console.log("Data supplier:", this.masterData.supplier);

    tableSupplier.innerHTML = "";

    // Cek apakah ada data supplier
    if (!this.masterData.supplier || this.masterData.supplier.length <= 1) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center text-muted">Tidak ada data supplier</td>`;
      tableSupplier.appendChild(row);
      return;
    }

    this.masterData.supplier.slice(1).forEach((supplier, index) => {
      const [kode, nama, kontak, alamat, jenis_buah, terms_pembayaran] =
        supplier;

      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${kode || "-"}</td>
            <td>${nama || "-"}</td>
            <td>${kontak || "-"}</td>
            <td>${alamat || "-"}</td>
            <td>${jenis_buah || "-"}</td>
            <td>${terms_pembayaran || "-"}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMasterData('supplier', ${index})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('supplier', ${index})">
                    <i class="bi bi-trash"></i> Hapus
                </button>
            </td>
        `;
      tableSupplier.appendChild(row);
    });
  }

  updateMasterPelangganTable() {
    const tablePelanggan = document.getElementById("tableMasterPelanggan");
    if (!tablePelanggan) {
      console.log(
        "Element tableMasterPelanggan tidak ditemukan (bisa jadi tidak ada di halaman ini)"
      );
      return;
    }

    console.log("Data pelanggan:", this.masterData.pelanggan);

    tablePelanggan.innerHTML = "";

    if (!this.masterData.pelanggan || this.masterData.pelanggan.length <= 1) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center text-muted">Tidak ada data pelanggan</td>`;
      tablePelanggan.appendChild(row);
      return;
    }

    this.masterData.pelanggan.slice(1).forEach((pelanggan, index) => {
      const [kode, nama, jenis, kontak, alamat, limit_kredit] = pelanggan;

      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${kode || "-"}</td>
            <td>${nama || "-"}</td>
            <td>${jenis || "-"}</td>
            <td>${kontak || "-"}</td>
            <td>${alamat || "-"}</td>
            <td>${formatCurrency(parseFloat(limit_kredit) || 0)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMasterData('pelanggan', ${index})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('pelanggan', ${index})">
                    <i class="bi bi-trash"></i> Hapus
                </button>
            </td>
        `;
      tablePelanggan.appendChild(row);
    });
  }

  updateMasterBiayaTable() {
    const tableBiaya = document.getElementById("tableMasterBiaya");
    if (!tableBiaya) {
      console.log(
        "Element tableMasterBiaya tidak ditemukan (bisa jadi tidak ada di halaman ini)"
      );
      return;
    }

    console.log("Data biaya:", this.masterData.biaya);

    tableBiaya.innerHTML = "";

    if (!this.masterData.biaya || this.masterData.biaya.length <= 1) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7" class="text-center text-muted">Tidak ada data biaya</td>`;
      tableBiaya.appendChild(row);
      return;
    }

    this.masterData.biaya.slice(1).forEach((biaya, index) => {
      const [kode, nama, kategori, sub_kategori, budget, status] = biaya;

      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${kode || "-"}</td>
            <td>${nama || "-"}</td>
            <td>${kategori || "-"}</td>
            <td>${sub_kategori || "-"}</td>
            <td>${formatCurrency(parseFloat(budget) || 0)}</td>
            <td>${status || "Aktif"}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editMasterData('biaya', ${index})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMasterData('biaya', ${index})">
                    <i class="bi bi-trash"></i> Hapus
                </button>
            </td>
        `;
      tableBiaya.appendChild(row);
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
    // Filter transactions by date range
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

    // Calculate totals
    const totalPenjualan = penjualan.reduce(
      (sum, t) => sum + parseFloat(t[9]),
      0
    );
    const totalPembelian = pembelian.reduce(
      (sum, t) => sum + parseFloat(t[6]),
      0
    );
    const totalBiaya = biaya.reduce((sum, t) => sum + parseFloat(t[3]), 0);

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
