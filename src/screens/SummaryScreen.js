import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions, loadPreviousRecords, savePreviousRecords } from '../storage/storage';
import {
  COLORS, formatCurrency, getMonthKey, formatMonthKey, prevMonth, nextMonth, todayISO,
} from '../utils/helpers';

export default function SummaryScreen({ navigation }) {
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [previousRecords, setPreviousRecords] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'year'
  const [monthKey, setMonthKey] = useState(getMonthKey(todayISO()));
  const [year, setYear] = useState(new Date().getFullYear());

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadCards(), loadTransactions(), loadPreviousRecords()]).then(
        ([c, t, pr]) => { setCards(c); setTransactions(t); setPreviousRecords(pr); }
      );
    }, [])
  );

  const cardMap = {};
  cards.forEach((c) => { cardMap[c.id] = c; });

  const isFutureMonth = monthKey > getMonthKey(todayISO());
  const isFutureYear = year > new Date().getFullYear();

  // ── MONTH MODE calculations ──────────────────────────────
  const monthTxns = transactions.filter((t) => getMonthKey(t.date) === monthKey);

  const monthCardStats = {};
  monthTxns.forEach((t) => {
    if (!monthCardStats[t.cardId]) {
      monthCardStats[t.cardId] = { count: 0, totalSpent: 0, cashback: 0, points: 0, pointsValue: 0, noCashback: 0, pendingCashback: 0, pendingPoints: 0, pendingPointsValue: 0 };
    }
    const s = monthCardStats[t.cardId];
    s.count++;
    s.totalSpent += t.amount || 0;
    const isUnbilled = t.billingStatus === 'unbilled';
    if (t.hasCashback) {
      const card = cardMap[t.cardId];
      if (card?.rewardType === 'points') {
        if (isUnbilled) { s.pendingPoints += t.rewardEarned || 0; s.pendingPointsValue += t.rewardValue || 0; }
        else { s.points += t.rewardEarned || 0; s.pointsValue += t.rewardValue || 0; }
      } else {
        if (isUnbilled) s.pendingCashback += t.rewardEarned || 0;
        else s.cashback += t.rewardEarned || 0;
      }
    } else { s.noCashback++; }
  });

  // Monthly previous records for this month
  const monthPrevRecords = previousRecords.filter(
    (r) => r.recordType === 'monthly' && r.monthKey === monthKey
  );

  const monthTotalSpent = Object.values(monthCardStats).reduce((s, v) => s + v.totalSpent, 0);
  const monthTxnEarned = Object.values(monthCardStats).reduce((s, v) => s + (cardMap[Object.keys(monthCardStats).find(k => monthCardStats[k] === v)]?.rewardType === 'points' ? v.pointsValue : v.cashback), 0);
  const monthPrevEarned = monthPrevRecords.reduce((s, r) => s + (r.rewardValue || 0), 0);
  const monthTotalEarned = monthTxnEarned + monthPrevEarned;

  // ── YEAR MODE calculations ───────────────────────────────
  const yearTxns = transactions.filter((t) => t.date?.startsWith(year.toString()));

  const yearCardStats = {};
  yearTxns.forEach((t) => {
    if (!yearCardStats[t.cardId]) {
      yearCardStats[t.cardId] = { count: 0, totalSpent: 0, cashback: 0, points: 0, pointsValue: 0, noCashback: 0 };
    }
    const s = yearCardStats[t.cardId];
    s.count++;
    s.totalSpent += t.amount || 0;
    if (t.hasCashback) {
      const card = cardMap[t.cardId];
      if (card?.rewardType === 'points') { s.points += t.rewardEarned || 0; s.pointsValue += t.rewardValue || 0; }
      else { s.cashback += t.rewardEarned || 0; }
    } else { s.noCashback++; }
  });

  const yearMonthlyRecords = previousRecords.filter(
    (r) => r.recordType === 'monthly' && r.year === year
  );
  const yearAnnualRecords = previousRecords.filter(
    (r) => r.recordType === 'annual' && r.year === year
  );

  const yearTotalSpent = Object.values(yearCardStats).reduce((s, v) => s + v.totalSpent, 0);
  const yearTxnEarned = Object.values(yearCardStats).reduce((s, v) => {
    const cId = Object.keys(yearCardStats).find(k => yearCardStats[k] === v);
    return s + (cardMap[cId]?.rewardType === 'points' ? v.pointsValue : v.cashback);
  }, 0);
  const yearMonthlyPrevEarned = yearMonthlyRecords.reduce((s, r) => s + (r.rewardValue || 0), 0);
  const yearAnnualPrevEarned = yearAnnualRecords.reduce((s, r) => s + (r.rewardValue || 0), 0);
  const yearTotalEarned = yearTxnEarned + yearMonthlyPrevEarned + yearAnnualPrevEarned;

  // ── Delete previous record ────────────────────────────────
  const deletePrevRecord = (record) => {
    const label = record.recordType === 'monthly'
      ? formatMonthKey(record.monthKey)
      : record.year + ' (Annual)';
    Alert.alert('Delete Record', `Remove the ${label} previous record?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = previousRecords.filter((r) => r.id !== record.id);
          await savePreviousRecords(updated);
          setPreviousRecords(updated);
        },
      },
    ]);
  };

  // ── Shared: all card IDs that have any data in the current view
  const activeCardIds = viewMode === 'month'
    ? [...new Set([...Object.keys(monthCardStats), ...monthPrevRecords.map((r) => r.cardId)])]
    : [...new Set([...Object.keys(yearCardStats), ...yearMonthlyRecords.map((r) => r.cardId), ...yearAnnualRecords.map((r) => r.cardId)])];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── View Mode Toggle ── */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'month' && styles.modeBtnActive]}
            onPress={() => setViewMode('month')} activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, viewMode === 'month' && styles.modeBtnTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'year' && styles.modeBtnActive]}
            onPress={() => setViewMode('year')} activeOpacity={0.8}
          >
            <Text style={[styles.modeBtnText, viewMode === 'year' && styles.modeBtnTextActive]}>Yearly</Text>
          </TouchableOpacity>
        </View>

        {/* ── Period Navigator ── */}
        {viewMode === 'month' ? (
          <View style={styles.nav}>
            <TouchableOpacity onPress={() => setMonthKey(prevMonth(monthKey))} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{formatMonthKey(monthKey)}</Text>
            <TouchableOpacity
              onPress={() => !isFutureMonth && setMonthKey(nextMonth(monthKey))}
              style={[styles.navBtn, isFutureMonth && { opacity: 0.3 }]}
              disabled={isFutureMonth}
            >
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.nav}>
            <TouchableOpacity onPress={() => setYear((y) => y - 1)} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{year}</Text>
            <TouchableOpacity
              onPress={() => !isFutureYear && setYear((y) => y + 1)}
              style={[styles.navBtn, isFutureYear && { opacity: 0.3 }]}
              disabled={isFutureYear}
            >
              <Ionicons name="chevron-forward" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Summary Banner ── */}
        <View style={styles.banner}>
          <BannerItem label="Total Spent" value={formatCurrency(viewMode === 'month' ? monthTotalSpent : yearTotalSpent)} />
          <View style={styles.bannerDivider} />
          <BannerItem label="Total Earned" value={formatCurrency(viewMode === 'month' ? monthTotalEarned : yearTotalEarned)} highlight />
          <View style={styles.bannerDivider} />
          <BannerItem label="Transactions" value={(viewMode === 'month' ? monthTxns : yearTxns).length.toString()} />
        </View>

        {/* ── Per-Card Breakdown ── */}
        {activeCardIds.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={56} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>
              No transactions or records for {viewMode === 'month' ? formatMonthKey(monthKey) : year}
            </Text>
          </View>
        ) : (
          activeCardIds.map((cardId) => {
            const card = cardMap[cardId];
            if (!card) return null;
            const isPoints = card.rewardType === 'points';

            if (viewMode === 'month') {
              const s = monthCardStats[cardId] || { count: 0, totalSpent: 0, cashback: 0, points: 0, pointsValue: 0, noCashback: 0 };
              const txnEarned = isPoints ? s.pointsValue : s.cashback;
              const pendingEarned = isPoints ? s.pendingPointsValue : s.pendingCashback;
              const prevRecord = monthPrevRecords.find((r) => r.cardId === cardId);
              const prevEarned = prevRecord ? prevRecord.rewardValue : 0;
              const total = txnEarned + prevEarned;

              return (
                <View key={cardId} style={styles.cardBlock}>
                  <CardHeader card={card} isPoints={isPoints} />
                  <View style={styles.statsRow}>
                    <StatBox label="Spent" value={formatCurrency(s.totalSpent)} />
                    <StatBox label="Txns" value={s.count.toString()} />
                    <StatBox label="No Reward" value={s.noCashback.toString()} accent={s.noCashback > 0} />
                  </View>
                  <View style={[styles.rewardBreakdown, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                    <RewardRow
                      label="📋 From transactions"
                      value={isPoints ? `${s.points.toFixed(0)} pts = ${formatCurrency(txnEarned)}` : formatCurrency(txnEarned)}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                    />
                    {pendingEarned > 0 && (
                      <RewardRow
                        label="⏳ Unbilled (pending)"
                        value={isPoints ? `${(s.pendingPoints||0).toFixed(0)} pts ≈ ${formatCurrency(pendingEarned)}` : formatCurrency(pendingEarned)}
                        color="#E65100"
                        pending
                      />
                    )}
                    <RewardRow
                      label="📝 Previous record"
                      value={prevRecord ? formatCurrency(prevEarned) : '—'}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                      dim={!prevRecord}
                      onDelete={prevRecord ? () => deletePrevRecord(prevRecord) : null}
                      onEdit={prevRecord ? () => navigation.navigate('AddPreviousRecord', { record: prevRecord, monthKey }) : null}
                    />
                    <View style={styles.rewardDivider} />
                    <RewardRow
                      label="💰 Total earned"
                      value={formatCurrency(total)}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                      bold
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addRecordBtn}
                    onPress={() => navigation.navigate('AddPreviousRecord', {
                      monthKey,
                      record: prevRecord || undefined,
                      ...(prevRecord ? {} : { cardIdPreset: cardId }),
                    })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={prevRecord ? 'create-outline' : 'add-circle-outline'} size={16} color={COLORS.primary} />
                    <Text style={styles.addRecordText}>
                      {prevRecord ? 'Edit previous record' : `Add previous record for ${formatMonthKey(monthKey)}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            } else {
              // Year mode
              const s = yearCardStats[cardId] || { count: 0, totalSpent: 0, cashback: 0, points: 0, pointsValue: 0, noCashback: 0 };
              const txnEarned = isPoints ? s.pointsValue : s.cashback;
              const monthlyPrev = yearMonthlyRecords.filter((r) => r.cardId === cardId);
              const annualRec = yearAnnualRecords.find((r) => r.cardId === cardId);
              const monthlyPrevTotal = monthlyPrev.reduce((sum, r) => sum + (r.rewardValue || 0), 0);
              const annualPrevTotal = annualRec ? annualRec.rewardValue : 0;
              const total = txnEarned + monthlyPrevTotal + annualPrevTotal;

              return (
                <View key={cardId} style={styles.cardBlock}>
                  <CardHeader card={card} isPoints={isPoints} />
                  <View style={styles.statsRow}>
                    <StatBox label="Spent" value={formatCurrency(s.totalSpent)} />
                    <StatBox label="Txns" value={s.count.toString()} />
                    <StatBox label="No Reward" value={s.noCashback.toString()} accent={s.noCashback > 0} />
                  </View>
                  <View style={[styles.rewardBreakdown, { backgroundColor: isPoints ? COLORS.pointsBg : COLORS.cashbackBg }]}>
                    <RewardRow
                      label="📋 From transactions"
                      value={isPoints ? `${s.points.toFixed(0)} pts = ${formatCurrency(txnEarned)}` : formatCurrency(txnEarned)}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                    />
                    <RewardRow
                      label={`📅 Monthly records (${monthlyPrev.length})`}
                      value={monthlyPrev.length > 0 ? formatCurrency(monthlyPrevTotal) : '—'}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                      dim={monthlyPrev.length === 0}
                    />
                    <RewardRow
                      label="📆 Annual record"
                      value={annualRec ? formatCurrency(annualPrevTotal) : '—'}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                      dim={!annualRec}
                      onDelete={annualRec ? () => deletePrevRecord(annualRec) : null}
                      onEdit={annualRec ? () => navigation.navigate('AddPreviousRecord', { record: annualRec, year }) : null}
                    />
                    <View style={styles.rewardDivider} />
                    <RewardRow
                      label="💰 Total earned"
                      value={formatCurrency(total)}
                      color={isPoints ? COLORS.pointsText : COLORS.cashbackText}
                      bold
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.addRecordBtn}
                    onPress={() => navigation.navigate('AddPreviousRecord', {
                      record: annualRec || undefined,
                      year,
                      ...(annualRec ? {} : { cardIdPreset: cardId }),
                    })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={annualRec ? 'create-outline' : 'add-circle-outline'} size={16} color={COLORS.primary} />
                    <Text style={styles.addRecordText}>
                      {annualRec ? 'Edit annual record' : `Add annual record for ${year}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }
          })
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* FAB — Add Previous Record */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPreviousRecord', {
          monthKey: viewMode === 'month' ? monthKey : undefined,
          year: viewMode === 'year' ? year : undefined,
        })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function BannerItem({ label, value, highlight }) {
  return (
    <View style={styles.bannerItem}>
      <Text style={styles.bannerLabel}>{label}</Text>
      <Text style={[styles.bannerValue, highlight && { color: '#A5D6A7' }]}>{value}</Text>
    </View>
  );
}

function CardHeader({ card, isPoints }) {
  return (
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
          {isPoints ? `${card.pointsPerRupee}x pts` : `${card.rewardPercent}% CB`}
        </Text>
      </View>
    </View>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, accent && { color: COLORS.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RewardRow({ label, value, color, bold, dim, pending, onDelete, onEdit }) {
  return (
    <View style={[styles.rewardRow, pending && styles.rewardRowPending]}>
      <Text style={[styles.rewardLabel, { color }, dim && { opacity: 0.5 }]}>{label}</Text>
      <View style={styles.rewardRowRight}>
        <Text style={[styles.rewardAmount, { color }, bold && { fontSize: 16 }, dim && { opacity: 0.5 }, pending && { fontStyle: 'italic' }]}>
          {value}
        </Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={{ marginLeft: 8 }}>
            <Ionicons name="create-outline" size={15} color={color} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={{ marginLeft: 6 }}>
            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 100 },
  modeToggle: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 14, overflow: 'hidden',
  },
  modeBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: COLORS.card },
  modeBtnActive: { backgroundColor: COLORS.primary },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSub },
  modeBtnTextActive: { color: '#fff' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 10,
    marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  navBtn: { padding: 8 },
  navTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  banner: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  bannerItem: { alignItems: 'center', flex: 1 },
  bannerLabel: { fontSize: 11, color: '#A5D6A7', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  bannerValue: { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 4 },
  bannerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 4, textAlign: 'center' },
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
  statValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textSub, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  rewardBreakdown: { borderRadius: 10, padding: 12, marginBottom: 10 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rewardRowPending: { borderRadius: 6, backgroundColor: 'rgba(255,143,0,0.08)', paddingHorizontal: 4, marginHorizontal: -4 },
  rewardRowRight: { flexDirection: 'row', alignItems: 'center' },
  rewardLabel: { fontSize: 13, fontWeight: '500', flex: 1 },
  rewardAmount: { fontSize: 13, fontWeight: '700' },
  rewardDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 6 },
  addRecordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
    borderColor: COLORS.border, borderStyle: 'dashed', gap: 6,
  },
  addRecordText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOpacity: 0.45, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
