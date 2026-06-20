import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import CardsScreen from './src/screens/CardsScreen';
import AddEditCardScreen from './src/screens/AddEditCardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AddEditTransactionScreen from './src/screens/AddEditTransactionScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import AddPreviousRecordScreen from './src/screens/AddPreviousRecordScreen';
import DataScreen from './src/screens/DataScreen';

const Tab = createBottomTabNavigator();
const CardsStack = createNativeStackNavigator();
const TxnStack = createNativeStackNavigator();
const SummaryStack = createNativeStackNavigator();

const HEADER = {
  headerStyle: { backgroundColor: '#1B5E20' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function CardsNavigator() {
  return (
    <CardsStack.Navigator screenOptions={HEADER}>
      <CardsStack.Screen name="CardsList" component={CardsScreen} options={{ title: 'My Cards' }} />
      <CardsStack.Screen
        name="AddEditCard"
        component={AddEditCardScreen}
        options={({ route }) => ({ title: route.params?.card ? 'Edit Card' : 'Add Card' })}
      />
    </CardsStack.Navigator>
  );
}

function TransactionsNavigator() {
  return (
    <TxnStack.Navigator screenOptions={HEADER}>
      <TxnStack.Screen name="TransactionsList" component={TransactionsScreen} options={{ title: 'Transactions' }} />
      <TxnStack.Screen
        name="AddEditTransaction"
        component={AddEditTransactionScreen}
        options={({ route }) => ({ title: route.params?.transaction ? 'Edit Transaction' : 'Add Transaction' })}
      />
    </TxnStack.Navigator>
  );
}

function SummaryNavigator() {
  return (
    <SummaryStack.Navigator screenOptions={HEADER}>
      <SummaryStack.Screen name="SummaryMain" component={SummaryScreen} options={{ title: 'Monthly Summary' }} />
      <SummaryStack.Screen
        name="AddPreviousRecord"
        component={AddPreviousRecordScreen}
        options={({ route }) => ({ title: route.params?.record ? 'Edit Previous Record' : 'Add Previous Record' })}
      />
    </SummaryStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#1B5E20',
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#E8F5E9',
            paddingBottom: 6,
            paddingTop: 4,
            height: 62,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarIcon: ({ focused, color, size }) => {
            const map = {
              Cards: focused ? 'card' : 'card-outline',
              Transactions: focused ? 'receipt' : 'receipt-outline',
              Summary: focused ? 'bar-chart' : 'bar-chart-outline',
              Data: focused ? 'cloud' : 'cloud-outline',
            };
            return <Ionicons name={map[route.name]} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Cards" component={CardsNavigator} />
        <Tab.Screen name="Transactions" component={TransactionsNavigator} />
        <Tab.Screen name="Summary" component={SummaryNavigator} />
        <Tab.Screen
          name="Data"
          component={DataScreen}
          options={{ headerShown: true, ...HEADER, title: 'Export / Import' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
