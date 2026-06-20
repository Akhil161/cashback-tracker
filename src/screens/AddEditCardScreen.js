import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { loadCards, saveCards } from '../storage/storage';
import { generateId, COLORS } from '../utils/helpers';

// Defined outside component to avoid remount on every render (which closes the keyboard)
function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function AddEditCardScreen({ route, navigation }) {
  const existing = route.params?.card;
  const [bankName, setBankName] = useState(existing?.bankName || '');
  const [last4, setLast4] = useState(existing?.last4 || '');
  const [rewardType, setRewardType] = useState(existing?.rewardType || 'cashback');
  const [rewardPercent, setRewardPercent] = useState(existing?.rewardPercent?.toString() || '');
  const [pointsPerRupee, setPointsPerRupee] = useState(existing?.pointsPerRupee?.toString() || '');
  const [pointsFor1Rupee, setPointsFor1Rupee] = useState(existing?.pointsFor1Rupee?.toString() || '');

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

    const cards = await loadCards();
    const card = {
      id: existing?.id || generateId(),
      bankName: bankName.trim(),
      last4,
      rewardType,
      rewardPercent: rewardType === 'cashback' ? parseFloat(rewardPercent) : undefined,
      pointsPerRupee: rewardType === 'points' ? parseFloat(pointsPerRupee) : undefined,
      pointsFor1Rupee: rewardType === 'points' ? parseFloat(pointsFor1Rupee) : undefined,
    };

    const updated = existing
      ? cards.map((c) => (c.id === card.id ? card : c))
      : [...cards, card];

    await saveCards(updated);
    navigation.goBack();
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

        <Field label="Last 4 Digits of Card">
          <TextInput
            style={styles.input}
            placeholder="e.g. 4321"
            placeholderTextColor={COLORS.textSub}
            value={last4}
            onChangeText={(v) => setLast4(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="numeric"
            maxLength={4}
          />
          <Text style={styles.hint}>Only last 4 digits — no full card number needed</Text>
        </Field>

        <Field label="Reward Type">
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, rewardType === 'cashback' && styles.toggleActive]}
              onPress={() => setRewardType('cashback')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, rewardType === 'cashback' && styles.toggleTextActive]}>
                💰 Cashback
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, rewardType === 'points' && styles.toggleActive]}
              onPress={() => setRewardType('points')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, rewardType === 'points' && styles.toggleTextActive]}>
                ⭐ Points
              </Text>
            </TouchableOpacity>
          </View>
        </Field>

        {rewardType === 'cashback' && (
          <Field label="Cashback Percentage (%)">
            <TextInput
              style={styles.input}
              placeholder="e.g. 1.5 for 1.5%"
              placeholderTextColor={COLORS.textSub}
              value={rewardPercent}
              onChangeText={setRewardPercent}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>For ₹1000 spend → ₹{((parseFloat(rewardPercent) || 0) * 10).toFixed(2)} cashback</Text>
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
              {pointsPerRupee && pointsFor1Rupee ? (
                <Text style={styles.hint}>
                  1 point = ₹{(1 / (parseFloat(pointsFor1Rupee) || 1)).toFixed(4)} •
                  For ₹1000 spend → {((parseFloat(pointsPerRupee) || 0) * 1000).toFixed(0)} pts
                  = ₹{(((parseFloat(pointsPerRupee) || 0) * 1000) / (parseFloat(pointsFor1Rupee) || 1)).toFixed(2)}
                </Text>
              ) : null}
            </Field>
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{existing ? 'Save Changes' : 'Add Card'}</Text>
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
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 12,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
