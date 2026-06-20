import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { loadCards, saveCards, loadTransactions, saveTransactions } from '../storage/storage';
import { generateId, COLORS, ROUNDING_MODES, calculateReward, applyRounding } from '../utils/helpers';

// Defined outside component — prevents keyboard closing on re-render
function Field({ label, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function AddEditCardScreen({ route, navigation }) {
  const existing = route.params?.card;

  const [bankName, setBankName]           = useState(existing?.bankName || '');
  const [last4, setLast4]                 = useState(existing?.last4 || '');
  const [rewardType, setRewardType]       = useState(existing?.rewardType || 'cashback');
  const [rewardPercent, setRewardPercent] = useState(existing?.rewardPercent?.toString() || '');
  const [pointsPerRupee, setPointsPerRupee]   = useState(existing?.pointsPerRupee?.toString() || '');
  const [pointsFor1Rupee, setPointsFor1Rupee] = useState(existing?.pointsFor1Rupee?.toString() || '');
  const [roundingMode, setRoundingMode]   = useState(existing?.roundingMode || 'none');
  const [saving, setSaving]               = useState(false);

  // Live cashback preview for rounding section
  const previewAmount = 1000;
  const previewPct    = parseFloat(rewardPercent) || 5;
  const rawCashback   = (previewAmount * previewPct) / 100;
  const roundedCashback = applyRounding(rawCashback, roundingMode);

  const save = async () => {
    if (!bankName.trim()) return Alert.alert('Error', 'Enter bank name');
    if (last4.length !== 4) return Alert.alert('Error', 'Enter exactly 4 digits');
    if (rewardType === 'cashback' && (!rewardPercent || parseFloat(rewardPercent) <= 0))
      return Alert.alert('Error', 'Enter a valid cashback %');
    if (rewardType === 'points') {
      if (!pointsPerRupee || parseFloat(pointsPerRupee) <= 0)
        return Alert.alert('Error', 'Enter points earned per ₹1');
      if (!pointsFor1Rupee || parseFloat(pointsFor1Rupee) <= 0)
        return Alert.alert('Error', 'Enter how many points = ₹1');
    }

    setSaving(true);
    try {
      const cards = await loadCards();
      const card = {
        id: existing?.id || generateId(),
        bankName: bankName.trim(),
        last4,
        rewardType,
        rewardPercent:   rewardType === 'cashback' ? parseFloat(rewardPercent)   : undefined,
        pointsPerRupee:  rewardType === 'points'   ? parseFloat(pointsPerRupee)  : undefined,
        pointsFor1Rupee: rewardType === 'points'   ? parseFloat(pointsFor1Rupee) : undefined,
        roundingMode,
      };

      const updatedCards = existing
        ? cards.map((c) => (c.id === card.id ? card : c))
        : [...cards, card];
      await saveCards(updatedCards);

      // ── Recalculate history when rounding or reward settings changed ──
      const roundingChanged = existing && existing.roundingMode !== roundingMode;
      const rewardChanged   = existing && (
        existing.rewardType    !== rewardType ||
        existing.rewardPercent !== card.rewardPercent ||
        existing.pointsPerRupee  !== card.pointsPerRupee ||
        existing.pointsFor1Rupee !== card.pointsFor1Rupee
      );

      if (existing && (roundingChanged || rewardChanged)) {
        const allTxns = await loadTransactions();
        const cardTxns = allTxns.filter((t) => t.cardId === card.id && t.hasCashback);
        const count = cardTxns.length;

        if (count > 0) {
          const recalculate = () => {
            const recalculated = allTxns.map((t) => {
              if (t.cardId !== card.id || !t.hasCashback) return t;
              const { rewardEarned, rewardValue } = calculateReward(t.amount, card);
              return { ...t, rewardEarned, rewardValue };
            });
            saveTransactions(recalculated);
          };

          Alert.alert(
            'Update Transaction History?',
            `${count} transaction${count > 1 ? 's' : ''} with cashback will be recalculated with the new ${roundingChanged ? 'rounding' : 'reward'} setting.\n\nThis cannot be undone.`,
            [
              {
                text: 'Skip',
                style: 'cancel',
                onPress: () => navigation.goBack(),
              },
              {
                text: `Update ${count} Transactions`,
                onPress: () => { recalculate(); navigation.goBack(); },
              },
            ]
          );
          return;
        }
      }

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Field label="Bank Name">
          <TextInput
            style={styles.input}
            placeholder="e.g. HDFC, SBI, ICICI"
            placeholderTextColor={COLORS.textSub}
            value={bankName}
            onChangeText={setBankName}
          />
        </Field>

        <Field label="Last 4 Digits of Card" hint="Only last 4 digits — no full card number needed">
          <TextInput
            style={styles.input}
            placeholder="e.g. 4321"
            placeholderTextColor={COLORS.textSub}
            value={last4}
            onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="numeric"
            maxLength={4}
          />
        </Field>

        <Field label="Reward Type">
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, rewardType === 'cashback' && styles.toggleActive]}
              onPress={() => setRewardType('cashback')} activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, rewardType === 'cashback' && styles.toggleTextActive]}>💰 Cashback</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, rewardType === 'points' && styles.toggleActive]}
              onPress={() => setRewardType('points')} activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, rewardType === 'points' && styles.toggleTextActive]}>⭐ Points</Text>
            </TouchableOpacity>
          </View>
        </Field>

        {rewardType === 'cashback' && (
          <Field
            label="Cashback Percentage (%)"
            hint={`₹1000 spend → ₹${((parseFloat(rewardPercent) || 0) * 10).toFixed(2)} cashback`}
          >
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.5 for 1.5%"
              placeholderTextColor={COLORS.textSub}
              value={rewardPercent}
              onChangeText={setRewardPercent}
              keyboardType="decimal-pad"
            />
          </Field>
        )}

        {rewardType === 'points' && (
          <>
            <Field label="Points Earned per ₹1 Spent">
              <TextInput
                style={styles.input}
                placeholder="e.g. 2 (2 points per ₹1)"
                placeholderTextColor={COLORS.textSub}
                value={pointsPerRupee}
                onChangeText={setPointsPerRupee}
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="How Many Points = ₹1 in Value?">
              <TextInput
                style={styles.input}
                placeholder="e.g. 4 (4 points = ₹1)"
                placeholderTextColor={COLORS.textSub}
                value={pointsFor1Rupee}
                onChangeText={setPointsFor1Rupee}
                keyboardType="decimal-pad"
              />
              {pointsPerRupee && pointsFor1Rupee && (
                <Text style={styles.hint}>
                  1 point = ₹{(1 / (parseFloat(pointsFor1Rupee) || 1)).toFixed(4)} •
                  ₹1000 → {((parseFloat(pointsPerRupee) || 0) * 1000).toFixed(0)} pts
                  = ₹{(((parseFloat(pointsPerRupee) || 0) * 1000) / (parseFloat(pointsFor1Rupee) || 1)).toFixed(2)}
                </Text>
              )}
            </Field>
          </>
        )}

        {/* ── Cashback Rounding ────────────────────────────────── */}
        <View style={styles.roundingSection}>
          <View style={styles.roundingHeader}>
            <Text style={styles.label}>Cashback Rounding</Text>
            <View style={styles.previewPill}>
              <Text style={styles.previewText}>
                ₹{previewAmount} × {previewPct}% = {' '}
                <Text style={{ textDecorationLine: roundingMode !== 'none' ? 'line-through' : 'none', color: COLORS.textSub }}>
                  ₹{rawCashback.toFixed(2)}
                </Text>
                {roundingMode !== 'none' && (
                  <Text style={{ color: COLORS.primary, fontWeight: '700' }}> → ₹{roundedCashback}</Text>
                )}
              </Text>
            </View>
          </View>

          <Text style={styles.roundingHint}>
            Most banks give whole-number cashback (e.g. ₹31, not ₹31.28). Match your bank's behaviour here.
          </Text>

          <View style={styles.roundingGrid}>
            {ROUNDING_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={[styles.roundingOption, roundingMode === mode.key && styles.roundingOptionActive]}
                onPress={() => setRoundingMode(mode.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.roundingSymbol, roundingMode === mode.key && styles.roundingSymbolActive]}>
                  {mode.symbol}
                </Text>
                <Text style={[styles.roundingLabel, roundingMode === mode.key && styles.roundingLabelActive]}>
                  {mode.label}
                </Text>
                <Text style={[styles.roundingDesc, roundingMode === mode.key && styles.roundingDescActive]}>
                  {mode.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={save} activeOpacity={0.85} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Card'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: COLORS.text,
  },
  hint: { fontSize: 12, color: COLORS.textSub, marginTop: 6, marginLeft: 2 },
  toggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.card },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 15, fontWeight: '600', color: COLORS.textSub },
  toggleTextActive: { color: '#fff' },

  // Rounding section
  roundingSection: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 20,
  },
  roundingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  previewPill: { backgroundColor: COLORS.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  previewText: { fontSize: 12, color: COLORS.text },
  roundingHint: { fontSize: 12, color: COLORS.textSub, marginBottom: 14, lineHeight: 17 },
  roundingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roundingOption: {
    flex: 1, minWidth: '45%', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    alignItems: 'center',
  },
  roundingOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roundingSymbol: { fontSize: 20, color: COLORS.textSub, marginBottom: 4 },
  roundingSymbolActive: { color: '#fff' },
  roundingLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  roundingLabelActive: { color: '#fff' },
  roundingDesc: { fontSize: 11, color: COLORS.textSub, marginTop: 3, textAlign: 'center' },
  roundingDescActive: { color: '#C8E6C9' },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
