import { Link } from 'expo-router';
import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function PageContainer({ title, subtitle, children }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Link href="/" style={styles.home}>
          首页
        </Link>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
    backgroundColor: '#f4f6f8',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#17202a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  home: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#1f6feb',
    color: '#fff',
    overflow: 'hidden',
    fontWeight: '700',
  },
});
