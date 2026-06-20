import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions, saveTransactions } from '../storage/storage';
import { COLORS, formatCurrency, formatDate, formatMonthKey, getMonthKey } from '../utils/helpers';

// ── helpers ──────────────────────────────────────────────────
const CASHBACK_FILTERS = ['All', 'Got Cashback', 'No Cashback', 'Unbilled'];

function groupByMonth(txns) {
  // Returns array of { monthKey, label, items, totalSpent, totalEarned }
  const map = {};
  txns.forEach((t) => {
    const key = getMonthKey(t.date);
    if (!map[key]) map[key] = [];
    map[key].push(t);
  });
  return Object.keys(map)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({
      monthKey: key,
      label: formatMonthKey(key),
      items: map[key].sort((a, b) => (a.date < b.date ? 1 : -1)),
      totalSpent: map[key].reduce((s, t) => s + (t.amount || 0), 0),
      totalEarned: map[key].reduce((s, t) => s + (t.hasCashback ? (t.rewardValue || 0) : 0), 0),
      cashbackCount: map[key].filter((t) => t.hasCashback).length,
      noCashbackCount: map[key].filter((t) => !t.hasCashback).length,
    }));
}

// Defined outside to avoid keyboard-close remount
function MonthHeader({ label, totalSpent, totalEarned, cashbackCount, noCashbackCount }) {
  return (
    <View style={styles.monthHeader}>
      <View style={styles.monthHeaderLeft}>
        <Text style={styles.monthLabel}>{label}</Text>
        <Text style={styles.monthSub}>
          {cashbackCount + noCashbackCount} txns ·{' '}
          <Text style={{ color: COLORS.cashbackText }}>{cashbackCount} earned</Text>
          {noCashbackCount > 0 && (
            <Text style={{ color: '#9E9E9E' }}> · {noCashbackCount} missed</Text>
          )}
        </Text>
      </View>
      <View style={styles.monthHeaderRight}>
        <Text style={styles.monthSpent}>{formatCurrency(totalSpent)}</Text>
        {totalEarned > 0 && (
          <Text style={styles.monthEarned}>+{formatCurrency(totalEarned)}</Text>
        )}
      </View>
    </View>
  );
}

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [filterCardId, setFilterCardId] = useState(null);
  const [cashbackFilter, setCashbackFilter] = useState('All'); // 'All' | 'Got Cashback' | 'No Cashback'

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

  const cardMap = useMemo(() => {
    const m = {};
    cards.forEach((c) => { m[c.id] = c; });
    return m;
  }, [cards]);

  // Apply all filters
  const filtered = useMemo(() => {
    let result = transactions;
    if (filterCardId) result = result.filter((t) => t.cardId === filterCardId);
    if (cashbackFilter === 'Got Cashback') result = result.filter((t) => t.hasCashback && t.billingStatus !== 'unbilled');
    if (cashbackFilter === 'No Cashback')  result = result.filter((t) => !t.hasCashback);
    if (cashbackFilter === 'Unbilled')     result = result.filter((t) => t.billingStatus === 'unbilled');
    return result;
  }, [transactions, filterCardId, cashbackFilter]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  // Build flat list data: month headers interleaved with transactions
  const listData = useMemo(() => {
    const rows = [];
    grouped.forEach((group) => {
      rows.push({ type: 'header', ...group });
      group.items.forEach((item) => rows.push({ type: 'item', ...item }));
    });
    return rows;
  }, [grouped]);

  const renderRow = ({ item }) => {
    if (item.type === 'header') {
      return (
        <MonthHeader
          label={item.label}
          totalSpent={item.totalSpent}
          totalEarned={item.totalEarned}
          cashbackCount={item.cashbackCount}
          noCashbackCount={item.noCashbackCount}
        />
      );
    }
    const card = cardMap[item.cardId];
    const isPoints = card?.rewardType === 'points';

    return (
      <TouchableOpacity
        style={[styles.txnCard, !item.hasCashback && styles.txnCardMissed]}
        onPress={() => navigation.navigate('AddEditTransaction', { transaction: item })}
        onLongPress={() => deleteTransaction(item)}
        activeOpacity={0.85}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, {
            backgroundColor: item.billingStatus === 'unbilled'
              ? '#FF8F00'
              : item.hasCashback ? COLORS.primaryLight : '#E0E0E0',
          }]} />

        <View style={styles.txnInner}>
          <View style={styles.txnTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.merchant} numberOfLines={1}>{item.merchant || 'Unknown'}</Text>
              <Text style={styles.category}>{item.category} · {formatDate(item.date)}</Text>
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
              <View style={styles.cardChip}><Text style={styles.cardChipText}>Card removed</Text></View>
            )}

            {item.billingStatus === 'unbilled' ? (
              <View style={styles.unbilledChip}>
                <Text style={styles.unbilledChipText}>
                  ⏳ {item.hasCashback
                    ? `Pending ${isPoints ? `${item.rewardEarned} pts` : formatCurrency(item.rewardEarned)}`
                    : 'Unbilled'}
                </Text>
              </View>
            ) : item.hasCashback ? (
              <View style={[styles.rewardChip, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                <Text style={[styles.rewardChipText, { color: isPoints ? COLORS.pointsText : COLORS.cashbackText }]}>
                  {isPoints
                    ? `⭐ ${item.rewardEarned} pts ≈ ₹${item.rewardValue}`
                    : `💰 +${formatCurrency(item.rewardEarned)}`}
                </Text>
              </View>
            ) : (
              <View style={styles.noRewardChip}>
                <Text style={styles.noRewardText}>❌ No cashback</Text>
              </View>
            )}
          </View>

          {item.notes ? <Text style={styles.notes} numberOfLines={1}>📝 {item.notes}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Card filter row (wrapped) ── */}
      {cards.length > 0 && (
        <View style={styles.filterBar}>
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
        </View>
      )}

      {/* ── Cashback filter row ── */}
      <View style={styles.cashbackFilterRow}>
        {CASHBACK_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.cbChip, cashbackFilter === f && styles.cbChipActive(f)]}
            onPress={() => setCashbackFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[
                styles.cbChipText,
                cashbackFilter === f && {
                  color: f === 'All' ? '#fff'
                       : f === 'Got Cashback' ? COLORS.cashbackText
                       : f === 'Unbilled' ? '#E65100'
                       : COLORS.danger,
                },
              ]}>
              {f === 'Got Cashback' ? '💰 Got Cashback'
                : f === 'No Cashback' ? '❌ No Cashback'
                : f === 'Unbilled'    ? '⏳ Unbilled'
                : 'All'}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Transaction count badge */}
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filtered.length}</Text>
        </View>
      </View>

      {/* ── List ── */}
      {listData.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyText}>
            {cashbackFilter !== 'All'
              ? `No "${cashbackFilter}" transactions`
              : filterCardId ? 'No transactions for this card' : 'Tap + to log your first transaction'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) => item.id || `header_${item.monthKey}_${idx}`}
          renderItem={renderRow}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}
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

  // Card filter
  filterBar: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSub },
  chipTextActive: { color: '#fff' },

  // Cashback filter
  cashbackFilterRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8,
  },
  cbChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg,
  },
  cbChipActive: (f) => ({
    backgroundColor: f === 'Got Cashback' ? COLORS.cashbackBg
      : f === 'No Cashback' ? '#FFEBEE'
      : f === 'Unbilled'    ? '#FFF3E0'
      : COLORS.primary,
    borderColor: f === 'Got Cashback' ? COLORS.cashbackText
      : f === 'No Cashback' ? COLORS.danger
      : f === 'Unbilled'    ? '#FF8F00'
      : COLORS.primary,
  }),
  cbChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSub },
  countBadge: { marginLeft: 'auto', backgroundColor: COLORS.bg, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textSub },

  // Month header
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4, marginTop: 8,
  },
  monthHeaderLeft: { flex: 1 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  monthSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  monthHeaderRight: { alignItems: 'flex-end' },
  monthSpent: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  monthEarned: { fontSize: 12, fontWeight: '700', color: COLORS.cashbackText, marginTop: 1 },

  // Transaction card
  txnCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14,
    marginBottom: 8, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  txnCardMissed: { opacity: 0.82 },
  accentBar: { width: 4, borderRadius: 4 },
  txnInner: { flex: 1, padding: 14 },
  txnTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  merchant: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  category: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginLeft: 8 },
  txnBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardChipText: { fontSize: 11, color: COLORS.textSub },
  rewardChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rewardChipText: { fontSize: 12, fontWeight: '700' },
  noRewardChip: { backgroundColor: '#FFF3F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  noRewardText: { fontSize: 12, color: '#E57373', fontWeight: '600' },
  unbilledChip: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FFB300' },
  unbilledChipText: { fontSize: 12, color: '#E65100', fontWeight: '700' },
  notes: { fontSize: 12, color: COLORS.textSub, marginTop: 8 },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 6, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
