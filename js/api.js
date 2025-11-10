// ==================== CORS PROXY FALLBACK ====================
async function fetchWithCorsFallback(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
    throw new Error(`Direct fetch failed with status ${response.status}`);
  } catch (error) {
    console.warn(
      "⚠️ Direct fetch failed, mencoba lewat CORS proxy:",
      error.message
    );
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
    const response = await fetch(proxyUrl, options);
    if (!response.ok)
      throw new Error(`CORS proxy failed with status ${response.status}`);
    return response;
  }
}

// ==================== API FUNCTIONS WITH OAUTH ====================
async function getSheetData(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}?key=${API_KEY}`;
  const response = await fetchWithCorsFallback(url);
  const data = await response.json();
  return data.values || [];
}

async function appendToSheet(sheetName, data) {
  if (!isAuthenticated) {
    throw new Error("Silakan login terlebih dahulu untuk menambah data");
  }

  const values = [data];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}:append?valueInputOption=RAW`;

  const response = await fetchWithCorsFallback(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) throw new Error("Gagal menyimpan data");
  return await response.json();
}

async function updateSheetData(sheetName, range, data) {
  if (!isAuthenticated) {
    throw new Error("Silakan login terlebih dahulu untuk mengupdate data");
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=RAW`;

  const response = await fetchWithCorsFallback(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [data],
    }),
  });

  if (!response.ok) throw new Error("Gagal mengupdate data");
  return await response.json();
}

// ==================== DELETE FUNCTIONS ====================

/**
 * METHOD 1: Clear data di row tertentu (Recommended)
 * Hapus konten sel tapi pertahankan row kosong
 */
async function clearRowData(sheetName, rowIndex) {
  if (!isAuthenticated) {
    throw new Error("Silakan login terlebih dahulu untuk menghapus data");
  }

  // Range untuk clear data (contoh: "Sheet1!A2:Z2")
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}:clear`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal menghapus data");
  }

  return await response.json();
}

/**
 * METHOD 2: Delete entire row (More Complex)
 * Hapus seluruh baris dan geser data ke atas
 */
async function deleteEntireRow(sheetName, rowIndex) {
  if (!isAuthenticated) {
    throw new Error("Silakan login terlebih dahulu untuk menghapus data");
  }

  // Dapatkan sheet ID terlebih dahulu
  const sheetInfo = await getSheetInfo(sheetName);
  const sheetId = sheetInfo.properties.sheetId;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;

  const requestBody = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: rowIndex - 1, // 0-based index
            endIndex: rowIndex, // hapus 1 row
          },
        },
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Gagal menghapus baris");
  }

  return await response.json();
}

// Helper function untuk mendapatkan sheet info
async function getSheetInfo(sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties(sheetId,title))`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) throw new Error("Gagal mengambil info sheet");

  const data = await response.json();
  const sheet = data.sheets.find((s) => s.properties.title === sheetName);

  if (!sheet) throw new Error(`Sheet ${sheetName} tidak ditemukan`);

  return sheet;
}

async function deleteMasterData(type, index) {
  if (!isAuthenticated) {
    showAlert("Silakan login terlebih dahulu untuk menghapus data", "warning");
    return;
  }

  const sheetName = getSheetNameByType(type);
  const data = system.masterData[type][index + 1]; // +1 karena header
  const kode = data[0];
  const nama = data[1];

  if (!confirm(`Apakah Anda yakin ingin menghapus data ${nama} (${kode})?`))
    return;

  try {
    // Row index di Google Sheets (2-based karena header di row 1)
    const rowIndex = index + 2;

    // METHOD 1: Clear data (Recommended)
    await clearRowData(sheetName, rowIndex);

    showAlert(`Data ${nama} berhasil dihapus!`, "success");

    // Reload data untuk update UI
    await system.loadAllData();
  } catch (error) {
    console.error("Delete error:", error);
    showAlert(`Gagal menghapus data: ${error.message}`, "danger");
  }
}
