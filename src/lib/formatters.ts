/**
 * Centralized formatting utilities
 * Ensures consistent number and date formatting across the app
 */

/**
 * Format number with Vietnamese locale (dot as thousands separator)
 */
export const formatNumber = (num: number, decimals: number = 0): string => {
  if (decimals === 0) {
    return num.toLocaleString('vi-VN');
  }
  
  const fixed = num.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  if (decimals > 0 && decimalPart) {
    return `${formattedInteger},${decimalPart}`;
  }
  return formattedInteger;
};

/**
 * Format USD value (always 2 decimals, with $ prefix)
 */
export const formatUsd = (num: number): string => {
  return `$${formatNumber(num, 2)}`;
};

/**
 * Format token balance with smart decimal handling
 */
export const formatTokenBalance = (num: number): string => {
  if (num > 0 && num < 0.000001) {
    return formatNumber(num, 8);
  }
  if (num > 0 && num < 0.01) {
    return formatNumber(num, 6);
  }
  if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.0001) {
    return formatNumber(Math.round(num), 0);
  }
  return formatNumber(num, 4);
};

/**
 * Format date with Vietnamese locale
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('vi-VN');
};

/**
 * Format relative time (e.g., "5 phút trước")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return formatDate(dateString);
};

/**
 * Shorten wallet address for display
 */
export const shortenAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};
