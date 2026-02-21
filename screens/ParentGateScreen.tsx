import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../App';

const PIN_STORAGE_KEY = 'parent_pin';

type ParentGateScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ParentGate'>;
};

export default function ParentGateScreen({ navigation }: ParentGateScreenProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if PIN already exists
  useEffect(() => {
    checkExistingPin();
  }, []);

  const checkExistingPin = async () => {
    try {
      const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
      setHasExistingPin(storedPin !== null);
    } catch (error) {
      console.error('Error checking PIN:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    // Validate PIN is 4 digits
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Please enter a 4-digit PIN.');
      return;
    }

    // Check if PINs match
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match. Please try again.');
      return;
    }

    try {
      await AsyncStorage.setItem(PIN_STORAGE_KEY, pin);
      Alert.alert('Success', 'PIN has been set!', [
        { text: 'OK', onPress: () => navigation.navigate('ParentHome') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save PIN. Please try again.');
    }
  };

  const handleLogin = async () => {
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Please enter your 4-digit PIN.');
      return;
    }

    try {
      const storedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
      if (pin === storedPin) {
        setPin('');
        navigation.navigate('ParentHome');
      } else {
        Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect.');
        setPin('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify PIN. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show PIN setup screen if no PIN exists
  if (!hasExistingPin) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Set Parent PIN</Text>
        <Text style={styles.subtitle}>Create a 4-digit PIN to access parent settings</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter PIN"
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm PIN"
          value={confirmPin}
          onChangeText={setConfirmPin}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSetPin}>
          <Text style={styles.buttonText}>Set PIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show login screen if PIN exists
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Parent PIN</Text>
      <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter PIN"
        value={pin}
        onChangeText={setPin}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 20,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    letterSpacing: 10,
  },
  button: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 50,
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
