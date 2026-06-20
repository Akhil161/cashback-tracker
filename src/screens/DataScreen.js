import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions, loadPreviousRecords, clearAllData, importAllData } from '../storage/storage';
import { exportJSON, exportCSV, importJSON } from '../utils/exportImport';
import { COLORS } from '../utils/helpers';

export default function DataScreen() {
  const [loading, setLoading] = useState(null); // track which button is loading

  const run = async (key, fn) => {
    setLoading(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  const handleExportJSON = () =>
    run('json', async () => {
      const cards = await loadCards();
      const transactions = await loadTransactions();
      const previousRecords = await loadPreviousRecords();
      await exportJSON(cards, transactions, previousRecords);
    });

  const handleExportCSV = () =>
    run('csv', async () => {
      const cards = await loadCards();
      const transactions = await loadTransactions();
      if (transactions.length === 0) {
        Alert.alert('Nothing to Export', 'Add some transactions first.');
        return;
      }
      await exportCSV(cards, transactions);
    });

  const handleImportJSON = () =>
    run('import', async () => {
      const data = await importJSON();
      if (!data) return; // user cancelled
      Alert.alert(
        'Confirm Import',
        `This will REPLACE all current data with:\n• ${data.cards.length} cards\n• ${data.transactions.length} transactions\n\nContinue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              await importAllData(data);
              Alert.alert('Done', 'Data imported successfully!');
            },
          },
        ]
      );
    });

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will permanently delete all your cards and transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything', style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const ActionBtn = ({ id, icon, title, subtitle, onPress, color, danger }) => (
    <TouchableOpacity
      style={[styles.actionBtn, danger && styles.dangerBtn]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!!loading}
    >
      <View style={[styles.actionIcon, { backgroundColor: danger ? COLORS.dangerLight : COLORS.cashbackBg }]}>
        {loading === id ? (
          <ActivityIndicator size="small" color={danger ? COLORS.danger : COLORS.primary} />
        ) : (
          <Ionicons name={icon} size={22} color={danger ? COLORS.danger : (color || COLORS.primary)} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={[styles.actionTitle, danger && { color: COLORS.danger }]}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={danger ? COLORS.danger : COLORS.textSub} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Export */}
        <Text style={styles.sectionTitle}>Export Data</Text>
        <View style={styles.section}>
          <ActionBtn
            id="json"
            icon="cloud-download-outline"
            title="Export Backup (JSON)"
            subtitle="Full backup — use to restore data on this or another device"
            onPress={handleExportJSON}
          />
          <View style={styles.divider} />
          <ActionBtn
            id="csv"
            icon="document-text-outline"
            title="Export Transactions (CSV)"
            subtitle="Open in Excel, Google Sheets — all transactions with reward details"
            onPress={handleExportCSV}
            color={COLORS.accentLight}
          />
        </View>

        {/* Import */}
        <Text style={styles.sectionTitle}>Import Data</Text>
        <View style={styles.section}>
          <ActionBtn
            id="import"
            icon="cloud-upload-outline"
            title="Import from Backup (JSON)"
            subtitle="Restore from a previously exported JSON backup file"
            onPress={handleImportJSON}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primaryLight} />
          <Text style={styles.infoText}>
            To move data to a new phone: Export JSON → Transfer the file → Import JSON on the new device.
          </Text>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: COLORS.danger, marginTop: 8 }]}>Danger Zone</Text>
        <View style={styles.section}>
          <ActionBtn
            id="clear"
            icon="trash-outline"
            title="Clear All Data"
            subtitle="Permanently delete all cards and transactions"
            onPress={handleClearData}
            danger
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textSub,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4,
  },
  section: {
    backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
  },
  dangerBtn: { backgroundColor: '#FFF5F5' },
  actionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  actionSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2, lineHeight: 17 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 74 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 12,
    padding: 14, marginBottom: 24, gap: 10, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primaryMid, lineHeight: 19 },
});
