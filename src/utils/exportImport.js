import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const TEMP_DIR = FileSystem.cacheDirectory;

export const exportJSON = async (cards, transactions) => {
  const data = { version: 1, exportedAt: new Date().toISOString(), cards, transactions };
  const json = JSON.stringify(data, null, 2);
  const filename = `cashback-backup-${new Date().toISOString().split('T')[0]}.json`;
  const path = TEMP_DIR + filename;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Backup (JSON)' });
};

export const exportCSV = async (cards, transactions) => {
  const cardMap = {};
  cards.forEach((c) => { cardMap[c.id] = c; });

  const header = 'Date,Bank,Last4,Merchant,Category,Amount (₹),Got Cashback,Reward Earned,Reward Value (₹),Notes\n';

  const rows = transactions
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((t) => {
      const card = cardMap[t.cardId] || {};
      const rewardLabel =
        card.rewardType === 'points' ? `${t.rewardEarned} pts` : `₹${t.rewardEarned}`;
      return [
        t.date,
        card.bankName || '',
        card.last4 ? `****${card.last4}` : '',
        `"${(t.merchant || '').replace(/"/g, '""')}"`,
        t.category || '',
        t.amount,
        t.hasCashback ? 'Yes' : 'No',
        t.hasCashback ? rewardLabel : '',
        t.hasCashback ? t.rewardValue : '',
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    })
    .join('\n');

  const csv = header + rows;
  const filename = `cashback-transactions-${new Date().toISOString().split('T')[0]}.csv`;
  const path = TEMP_DIR + filename;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Transactions (CSV)' });
};

export const importJSON = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  const content = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const parsed = JSON.parse(content);

  if (!parsed.cards || !parsed.transactions) {
    throw new Error('Invalid backup file. Missing cards or transactions.');
  }

  return { cards: parsed.cards, transactions: parsed.transactions };
};
