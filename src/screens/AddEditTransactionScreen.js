import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal, FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, loadTransactions, saveTransactions } from '../storage/storage';
import { generateId, calculateReward, todayISO, CATEGORIES, COLORS, formatCurrency } from '../utils/helpers';

// Defined outside component to avoid remount on every render (which closes the keyboard)
function Field({ label, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

export default function AddEditTransactionScreen({ route, navigation }) {
  const existing = route.params?.transaction;
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(existing?.cardId || null);
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [merchant, setMerchant] = useState(existing?.merchant || '');
  const [category, setCategory] = useState(existing?.category || 'Other');
  const [date, setDate] = useState(existing?.date || todayISO());
  const [notes, setNotes] = useState(existing?.notes || '');
  const [hasCashback, setHasCashback] = useState(existing?.hasCashback ?? true);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    loadCards().then((c) => {
      setCards(c);
      if (!existing?.cardId && c.length > 0) setSelectedCardId(c[0].id);
    });
  }, []);

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const reward = hasCashback && selectedCard ? calculateReward(amount, selectedCard) : null;

  const save = async () => {
    if (!selectedCardId) return Alert.alert('Error', 'Please select a card');
    if (!amount || parseFloat(amount) <= 0) return Alert.alert('Error', 'Enter a valid amount');
    if (!merchant.trim()) return Alert.alert('Error', 'Enter merchant name');
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) return Alert.alert('Error', 'Date must be YYYY-MM-DD');

    const txns = await loadTransactions();
    const txn = {
      id: existing?.id || generateId(),
      cardId: selectedCardId,
      amount: parseFloat(amount),
      merchant: merchant.trim(),
      category,
      date,
      notes: notes.trim(),
      hasCashback,
      rewardEarned: hasCashback && reward ? reward.rewardEarned : 0,
      rewardValue: hasCashback && reward ? reward.rewardValue : 0,
    };

    const updated = existing
      ? txns.map((t) => (t.id === txn.id ? txn : t))
      : [...txns, txn];

    await saveTransactions(updated);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

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
              <Text style={styles.pickerPlaceholder}>
                {cards.length === 0 ? 'No cards added yet' : 'Select a card'}
              </Text>
            )}
            <Ionicons name="chevron-down" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </Field>

        {/* Amount */}
        <Field label="Amount Spent (₹)">
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
              placeholder="0.00"
              placeholderTextColor={COLORS.textSub}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
        </Field>

        {/* Merchant */}
        <Field label="Merchant / Store">
          <TextInput
            style={styles.input}
            placeholder="e.g. Zomato, Amazon, BPCL"
            placeholderTextColor={COLORS.textSub}
            value={merchant}
            onChangeText={setMerchant}
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <TouchableOpacity style={styles.picker} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.8}>
            <Text style={styles.pickerText}>{category}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </Field>

        {/* Date */}
        <Field label="Date (YYYY-MM-DD)">
          <TextInput
            style={styles.input}
            placeholder={todayISO()}
            placeholderTextColor={COLORS.textSub}
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes (Optional)">
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder="Any extra details..."
            placeholderTextColor={COLORS.textSub}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Field>

        {/* Cashback Toggle */}
        <View style={styles.cashbackRow}>
          <View>
            <Text style={styles.cashbackLabel}>Got Cashback / Points?</Text>
            <Text style={styles.cashbackSub}>Toggle on if this transaction earns reward</Text>
          </View>
          <Switch
            value={hasCashback}
            onValueChange={setHasCashback}
            trackColor={{ false: '#E0E0E0', true: COLORS.primaryLight }}
            thumbColor={hasCashback ? COLORS.primary : '#BDBDBD'}
          />
        </View>

        {/* Reward Preview */}
        {hasCashback && reward && selectedCard && (
          <View style={[styles.rewardBox, { backgroundColor: selectedCard.rewardType === 'cashback' ? COLORS.cashbackBg : COLORS.pointsBg }]}>
            <Text style={[styles.rewardTitle, { color: selectedCard.rewardType === 'cashback' ? COLORS.cashbackText : COLORS.pointsText }]}>
              {selectedCard.rewardType === 'cashback' ? '💰 Cashback Earned' : '⭐ Points Earned'}
            </Text>
            {selectedCard.rewardType === 'cashback' ? (
              <Text style={[styles.rewardValue, { color: COLORS.cashbackText }]}>
                {formatCurrency(reward.rewardEarned)}
              </Text>
            ) : (
              <>
                <Text style={[styles.rewardValue, { color: COLORS.pointsText }]}>
                  {reward.rewardEarned} points
                </Text>
                <Text style={[styles.rewardSub2, { color: COLORS.pointsText }]}>
                  ≈ {formatCurrency(reward.rewardValue)} value
                </Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{existing ? 'Save Changes' : 'Add Transaction'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Card Picker Modal */}
      <Modal visible={showCardPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCardPicker(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Card</Text>
          {cards.length === 0 ? (
            <Text style={styles.noCards}>No cards added. Go to Cards tab to add one.</Text>
          ) : (
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
          )}
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowCardPicker(false)}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)} />
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select Category</Text>
          <FlatList
            data={CATEGORIES}
            keyExtractor={(c) => c}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, category === item && styles.modalItemActive]}
                onPress={() => { setCategory(item); setShowCategoryPicker(false); }}
              >
                <Text style={[styles.modalItemText, category === item && { color: '#fff' }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalClose} onPress={() => setShowCategoryPicker(false)}>
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
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: COLORS.text,
  },
  amountRow: { flexDirection: 'row', alignItems: 'stretch' },
  rupee: {
    backgroundColor: COLORS.primary, color: '#fff', fontSize: 18, fontWeight: '700',
    paddingHorizontal: 16, textAlignVertical: 'center', borderRadius: 12,
    borderTopRightRadius: 0, borderBottomRightRadius: 0, lineHeight: 48, paddingTop: 12,
  },
  picker: {
    backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerText: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  pickerSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  pickerPlaceholder: { fontSize: 16, color: COLORS.textSub },
  cashbackRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  cashbackLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cashbackSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  rewardBox: { borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center' },
  rewardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rewardValue: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  rewardSub2: { fontSize: 14, fontWeight: '600', marginTop: 2 },
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
  noCards: { color: COLORS.textSub, textAlign: 'center', paddingVertical: 20 },
  modalItem: {
    padding: 14, borderRadius: 10, marginBottom: 8, backgroundColor: COLORS.bg,
  },
  modalItemActive: { backgroundColor: COLORS.primary },
  modalItemText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  modalItemSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  modalClose: {
    marginTop: 8, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: COLORS.textSub },
});
