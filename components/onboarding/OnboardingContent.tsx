import { ScrollView, StyleSheet, Text, View } from 'react-native';

export const OnboardingContent = () => {
  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>Welcome, Parent!</Text>
        <Text style={styles.description}>
          Let's create a magical reading experience for your little one! We just need a few details to personalize their story adventure.
        </Text>
        <View style={styles.iconsRow}>
          <Text style={styles.icon}>📖</Text>
          <Text style={styles.icon}>✨</Text>
          <Text style={styles.icon}>🌈</Text>
          <Text style={styles.icon}>🎨</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#8b5cf6', // violet-500
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: '#6b7280', // gray-500
    lineHeight: 28,
    textAlign: 'center',
    maxWidth: 448,
    marginBottom: 16,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  icon: {
    fontSize: 30,
  },
});
