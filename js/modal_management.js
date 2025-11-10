// ==================== MODAL MANAGEMENT ====================
let currentMasterType = "";
let editingData = null;
let editingIndex = null;

function showModal(masterType, data = null, index = null) {
  if (!isAuthenticated && !data) {
    showAlert("Silakan login terlebih dahulu untuk menambah data", "warning");
    return;
  }

  currentMasterType = masterType;
  editingData = data;
  editingIndex = index;

  // Hide all forms first
  document.querySelectorAll("#masterModal form").forEach((form) => {
    form.style.display = "none";
  });

  // Reset all forms
  document
    .querySelectorAll(
      "#masterModal input, #masterModal select, #masterModal textarea"
    )
    .forEach((input) => {
      input.value = "";
    });

  // Show appropriate form and set title
  let modalTitle = "";
  switch (masterType) {
    case "buah":
      document.getElementById("formMasterBuah").style.display = "block";
      modalTitle = data ? "Edit Data Buah" : "Tambah Data Buah";
      if (data) {
        populateBuahForm(data);
      } else {
        generateAutoKode("buah");
      }
      break;
    case "supplier":
      document.getElementById("formMasterSupplier").style.display = "block";
      modalTitle = data ? "Edit Data Supplier" : "Tambah Data Supplier";
      if (data) {
        populateSupplierForm(data);
      } else {
        generateAutoKode("supplier");
      }
      break;
    case "pelanggan":
      document.getElementById("formMasterPelanggan").style.display = "block";
      modalTitle = data ? "Edit Data Pelanggan" : "Tambah Data Pelanggan";
      if (data) {
        populatePelangganForm(data);
      } else {
        generateAutoKode("pelanggan");
      }
      break;
    case "biaya":
      document.getElementById("formMasterBiaya").style.display = "block";
      modalTitle = data ? "Edit Data Biaya" : "Tambah Data Biaya";
      if (data) {
        populateBiayaForm(data);
      } else {
        generateAutoKode("biaya");
      }
      break;
  }

  document.getElementById("masterModalTitle").textContent = modalTitle;

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById("masterModal"));
  modal.show();
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

  document.getElementById(`${type}Kode`).value = `${prefix}-${String(
    nextNumber
  ).padStart(3, "0")}`;
}

// Populate forms for editing
function populateBuahForm(data) {
  document.getElementById("buahKode").value = data[0];
  document.getElementById("buahNama").value = data[1];
  document.getElementById("buahKategori").value = data[2];
  document.getElementById("buahSatuan").value = data[3];
  document.getElementById("buahHargaBeli").value = data[4];
  document.getElementById("buahHargaJual").value = data[5];
  document.getElementById("buahStokMin").value = data[6];
  document.getElementById("buahStatus").value = data[7];
}

function populateSupplierForm(data) {
  document.getElementById("supplierKode").value = data[0];
  document.getElementById("supplierNama").value = data[1];
  document.getElementById("supplierKontak").value = data[2];
  document.getElementById("supplierAlamat").value = data[3];
  document.getElementById("supplierJenisBuah").value = data[4];
  document.getElementById("supplierTerms").value = data[5];
}

function populatePelangganForm(data) {
  document.getElementById("pelangganKode").value = data[0];
  document.getElementById("pelangganNama").value = data[1];
  document.getElementById("pelangganJenis").value = data[2];
  document.getElementById("pelangganKontak").value = data[3];
  document.getElementById("pelangganAlamat").value = data[4];
  document.getElementById("pelangganLimit").value = data[5];
}

function populateBiayaForm(data) {
  document.getElementById("biayaKode").value = data[0];
  document.getElementById("biayaNama").value = data[1];
  document.getElementById("biayaKategori").value = data[2];
  document.getElementById("biayaSubKategori").value = data[3];
  document.getElementById("biayaBudget").value = data[4];
  document.getElementById("biayaStatus").value = data[5];
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

    if (editingData) {
      // Find the row to update
      const allData = await getSheetData(sheetName);
      const rowIndex = allData.findIndex((row) => row[0] === editingData[0]);

      if (rowIndex !== -1) {
        await updateSheetData(sheetName, `${sheetName}!A${rowIndex + 1}`, data);
      } else {
        throw new Error("Data tidak ditemukan untuk diupdate");
      }
    } else {
      await appendToSheet(sheetName, data);
    }

    await system.loadAllData();

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("masterModal")
    );
    modal.hide();

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

function editMasterData(type, index) {
  const data = system.masterData[type][index + 1];
  showModal(type, data, index);
}
