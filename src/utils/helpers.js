export const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

/**
 * Calculate reward for a transaction given the card config.
 * Returns { rewardEarned, rewardValue } where:
 *   - rewardEarned = cashback ₹ (if type=cashback) OR points earned (if type=points)
 *   - rewardValue  = equivalent ₹ value always
 */
export const calculateReward = (amount, card) => {
  if (!card) return { rewardEarned: 0, rewardValue: 0 };
  const amt = parseFloat(amount) || 0;

  if (card.rewardType === 'cashback') {
    const pct = parseFloat(card.rewardPercent) || 0;
    const cashback = (amt * pct) / 100;
    return { rewardEarned: +cashback.toFixed(2), rewardValue: +cashback.toFixed(2) };
  } else {
    // points
    const ppr = parseFloat(card.pointsPerRupee) || 0;   // points earned per ₹1
    const p1r = parseFloat(card.pointsFor1Rupee) || 1;  // points needed to get ₹1
    const points = +(amt * ppr).toFixed(0);
    const value = +(points / p1r).toFixed(2);
    return { rewardEarned: points, rewardValue: value };
  }
};

export const formatCurrency = (amount) =>
  '₹' + (parseFloat(amount) || 0).toFixed(2);

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const todayISO = () => new Date().toISOString().split('T')[0];

export const getMonthKey = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.substring(0, 7); // "YYYY-MM"
};

export const formatMonthKey = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const d = new Date(+y, +m - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const prevMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const nextMonth = (key) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Travel',
  'Fuel',
  'Groceries',
  'Utilities',
  'Entertainment',
  'Healthcare',
  'Online',
  'Other',
];

export const COLORS = {
  primary: '#1B5E20',
  primaryMid: '#2E7D32',
  primaryLight: '#4CAF50',
  accent: '#FF8F00',
  accentLight: '#FFB300',
  bg: '#F1F8E9',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textSub: '#616161',
  border: '#C8E6C9',
  danger: '#C62828',
  dangerLight: '#FFEBEE',
  cashbackBg: '#E8F5E9',
  pointsBg: '#FFF8E1',
  cashbackText: '#1B5E20',
  pointsText: '#E65100',
};
