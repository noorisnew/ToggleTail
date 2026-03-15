/**
 * @deprecated LEGACY FILE - NOT USED BY EXPO ROUTER
 * 
 * This App.tsx file is from the old React Navigation setup.
 * The current app uses Expo Router with file-based routing in app/_layout.tsx.
 * 
 * This file is kept for reference but is NOT used when running the app.
 * The actual entry point is configured in package.json ("main": "expo-router/entry").
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import ChildHomeScreen from './screens/ChildHomeScreen';
import ParentHomeScreen from './screens/ParentHomeScreen';

// Define the types for our navigation routes
export type RootStackParamList = {
  ChildHome: undefined;
  ParentGate: undefined;
  ParentHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ChildHome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4A90D9',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="ChildHome"
          component={ChildHomeScreen}
          options={{ title: 'ToggleTail' }}
        />
        {/* ParentGate screen removed - use Expo Router app/parent-gate.tsx instead */}
        <Stack.Screen
          name="ParentHome"
          component={ParentHomeScreen}
          options={{ title: 'Parent Dashboard' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
