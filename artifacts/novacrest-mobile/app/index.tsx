import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function Index() {
  const router = useRouter();
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 1.2,
          bounciness: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) router.replace('/(auth)/login');
    });

    return () => animation.stop();
  }, [opacity, scale, router]);

  return (
    <View style={[styles.root, { backgroundColor: '#08090d' }]}>
      <Animated.View style={[styles.mark, { opacity, transform: [{ scale }] }]}>
        <Text style={[styles.n, { color: colors.primary }]}>N</Text>
      </Animated.View>
      <Animated.Text style={[styles.brand, { opacity }]}>NOVACREST</Animated.Text>
      <Animated.Text style={[styles.caption, { opacity }]}>CAPITAL</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: '#0d0e14',
    borderWidth: 1,
    borderColor: '#29251b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d9a520',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  n: {
    fontFamily: 'serif',
    fontSize: 132,
    lineHeight: 150,
    fontWeight: '400',
    textShadowColor: '#d9a520',
    textShadowRadius: 18,
  },
  brand: {
    marginTop: 28,
    color: '#f3e7c5',
    fontSize: 18,
    letterSpacing: 5,
    fontWeight: '600',
  },
  caption: {
    marginTop: 8,
    color: '#8f8a7d',
    fontSize: 10,
    letterSpacing: 7,
  },
});
