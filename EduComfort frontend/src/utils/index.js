export function formatCurrency(value, currency = 'UZS') {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
}

export function dateFormatter(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

export function apiErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (error.response && error.response.data) {
    return error.response.data.detail || JSON.stringify(error.response.data);
  }
  return error.message || String(error);
}
