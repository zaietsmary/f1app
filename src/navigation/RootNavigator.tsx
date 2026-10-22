import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import SessionDetailsScreen from '../screens/SessionDetailsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121216',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '800',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: '#121216',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false, // На домашньому екрані свій кастомний хедер
        }}
      />
      <Stack.Screen
        name="SessionDetails"
        component={SessionDetailsScreen}
        options={({ route }) => ({
          title: route.params.session.circuit_short_name || 'Деталі сесії',
          headerBackTitle: 'Сесії',
          headerTintColor: '#E10600',
        })}
      />
    </Stack.Navigator>
  );
}
