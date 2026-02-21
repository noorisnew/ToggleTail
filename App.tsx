import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import ChildHomeScreen from './screens/ChildHomeScreen';
import ParentGateScreen from './screens/ParentGateScreen';
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
        <Stack.Screen
          name="ParentGate"
          component={ParentGateScreen}
          options={{ title: 'Parent Access' }}
        />
        <Stack.Screen
          name="ParentHome"
          component={ParentHomeScreen}
          options={{ title: 'Parent Dashboard' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
