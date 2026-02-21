import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../App';

type ParentHomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ParentHome'>;
};

export default function ParentHomeScreen({ navigation }: ParentHomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent View</Text>
      <Text style={styles.subtitle}>Manage your child's settings here</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ChildHome')}
      >
        <Text style={styles.buttonText}>Back to Child Home</Text>
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
