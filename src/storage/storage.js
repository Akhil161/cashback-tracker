import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDS_KEY = '@cashback_cards';
const TRANSACTIONS_KEY = '@cashback_transactions';

export const loadCards = async () => {
  try {
    const data = await AsyncStorage.getItem(CARDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveCards = async (cards) => {
  try {
    await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  } catch {}
};

export const loadTransactions = async () => {
  try {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveTransactions = async (transactions) => {
  try {
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch {}
};

export const clearAllData = async () => {
  await AsyncStorage.multiRemove([CARDS_KEY, TRANSACTIONS_KEY]);
};

export const loadAllData = async () => {
  const cards = await loadCards();
  const transactions = await loadTransactions();
  return { cards, transactions };
};

export const importAllData = async ({ cards, transactions }) => {
  if (cards) await saveCards(cards);
  if (transactions) await saveTransactions(transactions);
};
