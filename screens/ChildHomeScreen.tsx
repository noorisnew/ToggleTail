import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../App';

type ChildHomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ChildHome'>;
};

export default function ChildHomeScreen({ navigation }: ChildHomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Child Home</Text>
      <Text style={styles.subtitle}>Welcome to ToggleTail!</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ParentGate')}
      >
        <Text style={styles.buttonText}>Parent Access</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
