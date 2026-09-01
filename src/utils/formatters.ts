export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatKg = (kg: number): string => {
  if (kg >= 1000) {
    const tons = (kg / 1000).toFixed(1).replace(/\.0$/, '');
    return `${tons} Ton${Number(tons) > 1 ? 's' : ''} (${kg.toLocaleString('en-IN')} kg)`;
  }
  return `${kg.toLocaleString('en-IN')} kg`;
};

export const formatDistance = (km: number): string => {
  return `${km} km`;
};
