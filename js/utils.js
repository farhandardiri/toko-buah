// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
  }).format(amount);
}

function showAlert(message, type = "success") {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-2`;
  alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
  const container = document.querySelector(".container-fluid");
  container.prepend(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
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
