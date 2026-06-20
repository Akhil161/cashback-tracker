import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadPreviousRecords, savePreviousRecords } from '../storage/storage';
import { generateId, COLORS, formatMonthKey, formatCurrency } from '../utils/helpers';

// Generate last 24 months as "YYYY-MM" strings
const generateMonthOptions = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }
  return months;
};

const generateYearOptions = () => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3];
};

// Defined outside to prevent keyboard-closing remount
function Field({ label, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export default function AddPreviousRecordScreen({ route, navigation }) {
  const existing = route.params?.record;
  const defaultMonthKey = route.params?.monthKey;
  const defaultYear = route.params?.year;
  const cardIdPreset = route.params?.cardIdPreset;

  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(existing?.cardId || null);
  const [recordType, setRecordType] = useState(existing?.recordType || 'monthly');
  const [monthKey, setMonthKey] = useState(existing?.monthKey || defaultMonthKey || generateMonthOptions()[0]);
  const [year, setYear] = useState(existing?.year || defaultYear || new Date().getFullYear());
  const [amount, setAmount] = useState(existing?.rewardAmount?.toString() || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    loadCards().then((c) => {
      setCards(c);
      if (!existing?.cardId) {
        setSelectedCardId(cardIdPreset || (c.length > 0 ? c[0].id : null));
      }
    });
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const isPoints = selectedCard?.rewardType === 'points';

  // For points cards: rewardAmount = points, rewardValue = points / pointsFor1Rupee
  const computedValue = isPoints
    ? +((parseFloat(amount) || 0) / (parseFloat(selectedCard?.pointsFor1Rupee) || 1)).toFixed(2)
    : parseFloat(amount) || 0;

  const save = async () => {
    if (!selectedCardId) return Alert.alert('Error', 'Please select a card');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Error', 'Enter a valid amount');

    const records = await loadPreviousRecords();

    // Check for duplicate (same card + type + period) — allow overwrite
    const isDuplicate = records.some((r) =>
      r.id !== existing?.id &&
      r.cardId === selectedCardId &&
      r.recordType === recordType &&
      (recordType === 'monthly' ? r.monthKey === monthKey : r.year === year)
    );

    if (isDuplicate) {
      return Alert.alert(
        'Record Exists',
        `A ${recordType === 'monthly' ? formatMonthKey(monthKey) : year} record already exists for this card. Edit the existing one instead.`
      );
    }

    const record = {
      id: existing?.id || generateId(),
      cardId: selectedCardId,
      recordType,
      monthKey: recordType === 'monthly' ? monthKey : null,
      year: recordType === 'annual' ? year : parseInt(monthKey?.split('-')[0]),
      rewardAmount: parseFloat(amount),
      rewardValue: computedValue,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = existing
      ? records.map((r) => (r.id === record.id ? record : r))
      : [...records, record];

    await savePreviousRecords(updated);
    navigation.goBack();
  };

  const monthOptions = generateMonthOptions();
  const yearOptions = generateYearOptions();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primaryLight} />
          <Text style={styles.infoText}>
            Use this to record cashback already credited by your bank — from statements before you started tracking, or amounts shown in your bank app.
          </Text>
        </View>

        {/* Card Picker */}
        <Field label="Credit Card">
          <TouchableOpacity style={styles.picker} onPress={() => setShowCardPicker(true)} activeOpacity={0.8}>
            {selectedCard ? (
              <View>
                <Text style={styles.pickerText}>{selectedCard.bankName} •••• {selectedCard.last4}</Text>
                <Text style={styles.pickerSub}>
                  {selectedCard.rewardType === 'cashback'
                    ? `💰 ${selectedCard.rewardPercent}% cashback`
                    : `⭐ ${selectedCard.pointsPerRupee}x points`}
                </Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select a card</Text>
            )}
            <Ionicons name="chevron-down" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </Field>

        {/* Record Type Toggle */}
        <Field label="Record Type">
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, recordType === 'monthly' && styles.toggleActive]}
              onPress={() => setRecordType('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, recordType === 'monthly' && styles.toggleTextActive]}>
                📅 This Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, recordType === 'annual' && styles.toggleActive]}
              onPress={() => setRecordType('annual')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, recordType === 'annual' && styles.toggleTextActive]}>
                📆 This Year (Total)
              </Text>
            </TouchableOpacity>
          </View>
        </Field>

        {/* Period Picker */}
        {recordType === 'monthly' ? (
          <Field label="Select Month">
            <TouchableOpacity style={styles.picker} onPress={() => setShowMonthPicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerText}>{formatMonthKey(monthKey)}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSub} />
            </TouchableOpacity>
          </Field>
        ) : (
          <Field label="Select Year">
            <TouchableOpacity style={styles.picker} onPress={() => setShowYearPicker(true)} activeOpacity={0.8}>
              <Text style={styles.pickerText}>{year}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSub} />
            </TouchableOpacity>
          </Field>
        )}

        {/* Amount */}
        <Field
          label={isPoints ? 'Points Earned' : 'Cashback Amount (₹)'}
          hint={
            isPoints && amount
              ? `≈ ${formatCurrency(computedValue)} value (${amount} pts ÷ ${selectedCard?.pointsFor1Rupee} = ₹${computedValue})`
              : isPoints
              ? `Enter total points earned for this period`
              : `Enter total ₹ cashback credited for this period`
          }
        >
          <View style={styles.amountRow}>
            <Text style={styles.prefix}>{isPoints ? '⭐' : '₹'}</Text>
            <TextInput
              style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
              placeholder={isPoints ? 'e.g. 1200' : 'e.g. 150.00'}
              placeholderTextColor={COLORS.textSub}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </Field>

        {/* Notes */}
        <Field label="Notes (Optional)">
          <TextInput
            style={[styles.input, { height: 68, textAlignVertical: 'top' }]}
            placeholder="e.g. From HDFC SmartPay statement"
            placeholderTextColor={COLORS.textSub}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Field>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{existing ? 'Save Changes' : 'Save Record'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Card Picker Modal */}
      <Modal visible={showCardPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCardPicker(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Card</Text>
          <FlatList
            data={cards}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, selectedCardId === item.id && styles.modalItemActive]}
                onPress={() => { setSelectedCardId(item.id); setShowCardPicker(false); }}
              >
                <Text style={[styles.modalItemText, selectedCardId === item.id && { color: '#fff' }]}>
                  {item.bankName} •••• {item.last4}
                </Text>
                <Text style={[styles.modalItemSub, selectedCardId === item.id && { color: '#C8E6C9' }]}>
                  {item.rewardType === 'cashback' ? `${item.rewardPercent}% cashback` : `${item.pointsPerRupee}x points`}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowCardPicker(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Month</Text>
          <FlatList
            data={monthOptions}
            keyExtractor={(m) => m}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, monthKey === item && styles.modalItemActive]}
                onPress={() => { setMonthKey(item); setShowMonthPicker(false); }}
              >
                <Text style={[styles.modalItemText, monthKey === item && { color: '#fff' }]}>
                  {formatMonthKey(item)}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowMonthPicker(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowYearPicker(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Year</Text>
          <FlatList
            data={yearOptions}
            keyExtractor={(y) => y.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, year === item && styles.modalItemActive]}
                onPress={() => { setYear(item); setShowYearPicker(false); }}
              >
                <Text style={[styles.modalItemText, year === item && { color: '#fff' }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowYearPicker(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 48 },
  infoBanner: {
    flexDirection: 'row', backgroundColor: '#E8F5E9', borderRadius: 12,
    padding: 12, marginBottom: 20, gap: 10, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: COLORS.primaryMid, lineHeight: 19 },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  hint: { fontSize: 12, color: COLORS.textSub, marginTop: 6, marginLeft: 2 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: COLORS.text,
  },
  amountRow: { flexDirection: 'row', alignItems: 'stretch' },
  prefix: {
    backgroundColor: COLORS.primary, color: '#fff', fontSize: 16,
    paddingHorizontal: 14, textAlignVertical: 'center', borderRadius: 12,
    borderTopRightRadius: 0, borderBottomRightRadius: 0, lineHeight: 48, paddingTop: 12,
  },
  toggle: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.card },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 14, fontWeight: '600', color: COLORS.textSub },
  toggleTextActive: { color: '#fff' },
  picker: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  pickerSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  pickerPlaceholder: { fontSize: 16, color: COLORS.textSub },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '60%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalItem: { padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: COLORS.bg },
  modalItemActive: { backgroundColor: COLORS.primary },
  modalItemText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalItemSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  modalClose: { marginTop: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.textSub },
});
