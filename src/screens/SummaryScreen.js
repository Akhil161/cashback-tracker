import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions } from '../storage/storage';
import {
  COLORS, formatCurrency, getMonthKey, formatMonthKey, prevMonth, nextMonth, todayISO,
} from '../utils/helpers';

export default function SummaryScreen() {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [monthKey, setMonthKey] = useState(getMonthKey(todayISO()));

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadCards(), loadTransactions()]).then(([c, t]) => {
        setCards(c);
        setTransactions(t);
      });
    }, [])
  );

  const cardMap = {};
  cards.forEach((c) => { cardMap[c.id] = c; });

  const monthTxns = transactions.filter((t) => getMonthKey(t.date) === monthKey);

  // Group by card
  const cardStats = {};
  monthTxns.forEach((t) => {
    if (!cardStats[t.cardId]) {
      cardStats[t.cardId] = { count: 0, totalSpent: 0, cashback: 0, points: 0, pointsValue: 0, noCashback: 0 };
    }
    const s = cardStats[t.cardId];
    s.count++;
    s.totalSpent += t.amount || 0;
    if (t.hasCashback) {
      const card = cardMap[t.cardId];
      if (card?.rewardType === 'points') {
        s.points += t.rewardEarned || 0;
        s.pointsValue += t.rewardValue || 0;
      } else {
        s.cashback += t.rewardEarned || 0;
      }
    } else {
      s.noCashback++;
    }
  });

  const totalCashback = Object.values(cardStats).reduce((sum, s) => sum + s.cashback + s.pointsValue, 0);
  const totalSpent = Object.values(cardStats).reduce((sum, s) => sum + s.totalSpent, 0);

  const isFuture = monthKey > getMonthKey(todayISO());

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setMonthKey(prevMonth(monthKey))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatMonthKey(monthKey)}</Text>
          <TouchableOpacity
            onPress={() => !isFuture && setMonthKey(nextMonth(monthKey))}
            style={[styles.navBtn, isFuture && { opacity: 0.3 }]}
            disabled={isFuture}
          >
            <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Total Summary Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Total Spent</Text>
            <Text style={styles.bannerValue}>{formatCurrency(totalSpent)}</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Total Earned</Text>
            <Text style={[styles.bannerValue, { color: '#A5D6A7' }]}>{formatCurrency(totalCashback)}</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerLabel}>Transactions</Text>
            <Text style={styles.bannerValue}>{monthTxns.length}</Text>
          </View>
        </View>

        {/* Per Card Breakdown */}
        {Object.keys(cardStats).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyText}>No data for {formatMonthKey(monthKey)}</Text>
          </View>
        ) : (
          Object.entries(cardStats).map(([cardId, s]) => {
            const card = cardMap[cardId];
            if (!card) return null;
            const isPoints = card.rewardType === 'points';
            const earnedValue = isPoints ? s.pointsValue : s.cashback;
            const effectiveRate = s.totalSpent > 0 ? (earnedValue / s.totalSpent) * 100 : 0;

            return (
              <View key={cardId} style={styles.cardBlock}>
                <View style={styles.cardBlockHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                    <Ionicons name="card" size={20} color={isPoints ? COLORS.pointsText : COLORS.cashbackText} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardBlockTitle}>{card.bankName}</Text>
                    <Text style={styles.cardBlockSub}>•••• {card.last4}</Text>
                  </View>
                  <View style={[styles.rateBadge, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                    <Text style={[styles.rateText, { color: isPoints ? COLORS.pointsText : COLORS.cashbackText }]}>
                      {effectiveRate.toFixed(2)}% effective
                    </Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <StatBox label="Spent" value={formatCurrency(s.totalSpent)} />
                  <StatBox label="Transactions" value={s.count.toString()} />
                  <StatBox label="No Reward" value={s.noCashback.toString()} accent={s.noCashback > 0} />
                </View>

                <View style={[styles.rewardSummary, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                  {isPoints ? (
                    <View style={styles.rewardRow}>
                      <Text style={[styles.rewardLabel, { color: COLORS.pointsText }]}>⭐ Points Earned</Text>
                      <Text style={[styles.rewardAmount, { color: COLORS.pointsText }]}>{s.points.toFixed(0)} pts</Text>
                    </View>
                  ) : null}
                  <View style={styles.rewardRow}>
                    <Text style={[styles.rewardLabel, { color: isPoints ? COLORS.pointsText : COLORS.cashbackText }]}>
                      {isPoints ? '💰 Points Value' : '💰 Cashback Earned'}
                    </Text>
                    <Text style={[styles.rewardAmount, { color: isPoints ? COLORS.pointsText : COLORS.cashbackText }]}>
                      {formatCurrency(earnedValue)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatBox = ({ label, value, accent }) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, accent && { color: COLORS.accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 8,
    paddingVertical: 10, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  banner: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  bannerItem: { alignItems: 'center', flex: 1 },
  bannerLabel: { fontSize: 11, color: '#A5D6A7', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  bannerValue: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
  cardBlock: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardBlockHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBlockTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardBlockSub: { fontSize: 12, color: COLORS.textSub, marginTop: 1 },
  rateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rateText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: COLORS.bg, borderRadius: 10, marginHorizontal: 3,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textSub, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  rewardSummary: { borderRadius: 10, padding: 12 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rewardLabel: { fontSize: 13, fontWeight: '600' },
  rewardAmount: { fontSize: 15, fontWeight: '800' },
});
