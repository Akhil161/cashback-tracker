import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadCards, saveCards } from '../storage/storage';
import { COLORS } from '../utils/helpers';

export default function CardsScreen({ navigation }) {
  const [cards, setCards] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadCards().then(setCards);
    }, [])
  );

  const deleteCard = (card) => {
    Alert.alert('Delete Card', `Remove ${card.bankName} ****${card.last4}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = cards.filter((c) => c.id !== card.id);
          await saveCards(updated);
          setCards(updated);
        },
      },
    ]);
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AddEditCard', { card: item })}
      onLongPress={() => deleteCard(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconBox, { backgroundColor: item.rewardType === 'cashback' ? COLORS.cashbackBg : COLORS.pointsBg }]}>
          <Ionicons name="card" size={24} color={item.rewardType === 'cashback' ? COLORS.cashbackText : COLORS.pointsText} />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.bankName}>{item.bankName}</Text>
          <Text style={styles.cardNumber}>•••• •••• •••• {item.last4}</Text>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: item.rewardType === 'cashback' ? COLORS.cashbackBg : COLORS.pointsBg }]}>
              <Text style={[styles.badgeText, { color: item.rewardType === 'cashback' ? COLORS.cashbackText : COLORS.pointsText }]}>
                {item.rewardType === 'cashback' ? '💰 Cashback' : '⭐ Points'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.cardRight}>
        {item.rewardType === 'cashback' ? (
          <Text style={styles.rewardBig}>{item.rewardPercent}%</Text>
        ) : (
          <>
            <Text style={styles.rewardBig}>{item.pointsPerRupee}x</Text>
            <Text style={styles.rewardSub}>{item.pointsFor1Rupee} pts = ₹1</Text>
          </>
        )}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textSub} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={64} color={COLORS.border} />
          <Text style={styles.emptyTitle}>No Cards Yet</Text>
          <Text style={styles.emptyText}>Tap + to add your first credit card</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditCard', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bankName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardNumber: { fontSize: 13, color: COLORS.textSub, marginTop: 2, letterSpacing: 1 },
  row: { flexDirection: 'row', marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', minWidth: 60 },
  rewardBig: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  rewardSub: { fontSize: 11, color: COLORS.textSub, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSub, marginTop: 6 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.45, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
});
