import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

const F1Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#121216',
    card: '#1B1B24',
    text: '#FFFFFF',
    border: '#2A2A38',
    primary: '#E10600',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={F1Theme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
