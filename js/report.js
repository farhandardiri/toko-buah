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
                            <tr><th>Pendapatan Penjualan</th><td class="text-end">${formatCurrency(
                              laporan.totalPenjualan
                            )}</td></tr>
                            <tr><th>Harga Pokok Penjualan</th><td class="text-end">${formatCurrency(
                              laporan.totalPembelian
                            )}</td></tr>
                            <tr class="table-success"><th><strong>Laba Kotor</strong></th><td class="text-end"><strong>${formatCurrency(
                              laporan.labaKotor
                            )}</strong></td></tr>
                            <tr><th>Biaya Operasional</th><td class="text-end">${formatCurrency(
                              laporan.totalBiaya
                            )}</td></tr>
                            <tr class="table-primary"><th><strong>LABA BERSIH</strong></th><td class="text-end"><strong>${formatCurrency(
                              laporan.labaBersih
                            )}</strong></td></tr>
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
    const [kode, nama, , satuan, hargaBeli] = buah;
    const currentStock = system.calculateCurrentStock(kode);

    const totalPembelian = system.transactions.pembelian
      .slice(1)
      .filter((t) => t[3] === kode)
      .reduce((sum, t) => sum + parseFloat(t[4]), 0);

    const totalPenjualan = system.transactions.penjualan
      .slice(1)
      .filter((t) => t[3] === kode)
      .reduce((sum, t) => sum + parseFloat(t[4]), 0);

    const nilaiPersediaan = currentStock * parseFloat(hargaBeli);

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${nama}</td>
            <td>0 ${satuan}</td>
            <td>${totalPembelian.toFixed(1)} ${satuan}</td>
            <td>${totalPenjualan.toFixed(1)} ${satuan}</td>
            <td><strong>${currentStock.toFixed(1)} ${satuan}</strong></td>
            <td>${formatCurrency(nilaiPersediaan)}</td>
        `;
    stokContainer.appendChild(row);
  });
}
