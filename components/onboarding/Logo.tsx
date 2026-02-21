import { Image, StyleSheet, View } from 'react-native';
import { Colors, Shadows } from '../../constants/design';

export const Logo = () => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://sticky-tidy-98054511.figma.site/_assets/v11/bc51a01ea1206b6c6f9b48c0a319a5d9c2633ba0.png' }}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 128,
    height: 128,
    backgroundColor: Colors.cardBackground,
    borderRadius: 64,
    borderWidth: 6,
    borderColor: '#facc15', // yellow-400
    overflow: 'hidden',
    ...Shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
