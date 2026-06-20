import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions, saveTransactions } from '../storage/storage';
import { COLORS, formatCurrency, formatDate } from '../utils/helpers';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [filterCardId, setFilterCardId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadCards(), loadTransactions()]).then(([c, t]) => {
        setCards(c);
        setTransactions(t.sort((a, b) => (a.date < b.date ? 1 : -1)));
      });
    }, [])
  );

  const deleteTransaction = (txn) => {
    Alert.alert('Delete Transaction', `Remove ₹${txn.amount} at ${txn.merchant}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = transactions.filter((t) => t.id !== txn.id);
          await saveTransactions(updated);
          setTransactions(updated);
        },
      },
    ]);
  };

  const cardMap = {};
  cards.forEach((c) => { cardMap[c.id] = c; });

  const filtered = filterCardId
    ? transactions.filter((t) => t.cardId === filterCardId)
    : transactions;

  const renderTransaction = ({ item }) => {
    const card = cardMap[item.cardId];
    const isPoints = card?.rewardType === 'points';

    return (
      <TouchableOpacity
        style={styles.txnCard}
        onPress={() => navigation.navigate('AddEditTransaction', { transaction: item })}
        onLongPress={() => deleteTransaction(item)}
        activeOpacity={0.85}
      >
        <View style={styles.txnTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.merchant} numberOfLines={1}>{item.merchant || 'Unknown'}</Text>
            <Text style={styles.category}>{item.category} • {formatDate(item.date)}</Text>
          </View>
          <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        </View>

        <View style={styles.txnBottom}>
          {card ? (
            <View style={styles.cardChip}>
              <Ionicons name="card-outline" size={12} color={COLORS.textSub} />
              <Text style={styles.cardChipText}> {card.bankName} ****{card.last4}</Text>
            </View>
          ) : (
            <View style={styles.cardChip}>
              <Text style={styles.cardChipText}>Card removed</Text>
            </View>
          )}

          {item.hasCashback ? (
            <View style={[styles.rewardChip, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
              <Text style={[styles.rewardChipText, { color: isPoints ? COLORS.pointsText : COLORS.cashbackText }]}>
                {isPoints
                  ? `⭐ ${item.rewardEarned} pts ≈ ₹${item.rewardValue}`
                  : `💰 +${formatCurrency(item.rewardEarned)}`}
              </Text>
            </View>
          ) : (
            <View style={styles.noRewardChip}>
              <Text style={styles.noRewardText}>No cashback</Text>
            </View>
          )}
        </View>

        {item.notes ? <Text style={styles.notes} numberOfLines={1}>📝 {item.notes}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Card filter chips */}
      {cards.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <TouchableOpacity
            style={[styles.chip, !filterCardId && styles.chipActive]}
            onPress={() => setFilterCardId(null)}
          >
            <Text style={[styles.chipText, !filterCardId && styles.chipTextActive]}>All Cards</Text>
          </TouchableOpacity>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, filterCardId === c.id && styles.chipActive]}
              onPress={() => setFilterCardId(filterCardId === c.id ? null : c.id)}
            >
              <Text style={[styles.chipText, filterCardId === c.id && styles.chipTextActive]}>
                {c.bankName} ****{c.last4}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyText}>
            {filterCardId ? 'No transactions for this card' : 'Tap + to log your first transaction'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditTransaction', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  filterBar: { backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 56 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, marginRight: 8,
    backgroundColor: COLORS.card,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSub },
  chipTextActive: { color: '#fff' },
  txnCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  txnTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  merchant: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  category: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  txnBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  cardChipText: { fontSize: 11, color: COLORS.textSub },
  rewardChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rewardChipText: { fontSize: 12, fontWeight: '700' },
  noRewardChip: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  noRewardText: { fontSize: 12, color: '#9E9E9E' },
  notes: { fontSize: 12, color: COLORS.textSub, marginTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 6, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
