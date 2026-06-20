import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDS_KEY = '@cashback_cards';
const TRANSACTIONS_KEY = '@cashback_transactions';
const PREV_RECORDS_KEY = '@cashback_previous_records';

export const loadCards = async () => {
  try {
    const data = await AsyncStorage.getItem(CARDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveCards = async (cards) => {
  try { await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch {}
};

export const loadTransactions = async () => {
  try {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveTransactions = async (transactions) => {
  try { await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions)); } catch {}
};

export const loadPreviousRecords = async () => {
  try {
    const data = await AsyncStorage.getItem(PREV_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const savePreviousRecords = async (records) => {
  try { await AsyncStorage.setItem(PREV_RECORDS_KEY, JSON.stringify(records)); } catch {}
};

export const clearAllData = async () => {
  await AsyncStorage.multiRemove([CARDS_KEY, TRANSACTIONS_KEY, PREV_RECORDS_KEY]);
};

export const loadAllData = async () => {
  const [cards, transactions, previousRecords] = await Promise.all([
    loadCards(), loadTransactions(), loadPreviousRecords(),
  ]);
  return { cards, transactions, previousRecords };
};

export const importAllData = async ({ cards, transactions, previousRecords }) => {
  if (cards) await saveCards(cards);
  if (transactions) await saveTransactions(transactions);
  if (previousRecords) await savePreviousRecords(previousRecords);
};
