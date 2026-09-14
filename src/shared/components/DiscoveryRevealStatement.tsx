import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const DiscoveryRevealStatement = React.memo(() => (
  <View style={styles.container}>
    <Text style={styles.title}>Fikirler burada keşfedilir.</Text>
  </View>
));

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginHorizontal: 16, marginVertical: 20, paddingVertical: 3, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: '#3269C7' },
  title: { color: '#252333', fontSize: 22, lineHeight: 28, fontWeight: '800' },
});
