import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Card          from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Customer, Paged, api } from '../lib/api';
import { COLORS } from '../lib/theme';

export default function CustomersScreen({ navigation }: any) {
  const [items, setItems]     = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<Paged<Customer>>('/customers/', { search });
      setItems(d.results);
    } finally { setLoading(false); }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      {/* warm gradient header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Clients</Text>
        <Text style={styles.title}>Customers</Text>
        <View style={styles.toolbar}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
            placeholder="Search…"
            placeholderTextColor={COLORS.textLight}
            style={styles.search}
          />
          <PrimaryButton
            title="+ New"
            onPress={() => navigation.navigate('CustomerForm')}
            style={{ paddingHorizontal: 18 }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={c => String(c.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No customers yet. Tap "+ New" to add one.</Text>}
          renderItem={({ item }) => (
            <Card>
              {/* avatar circle */}
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  {item.email ? <Text style={styles.meta}>{item.email}</Text> : null}
                  {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
                </View>
              </View>
              {item.notes ? <Text style={[styles.meta, { marginTop: 8, fontStyle: 'italic' }]}>{item.notes}</Text> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.gradEnd,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', color: COLORS.darkMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  title:   { fontSize: 32, fontWeight: '900', fontStyle: 'italic', color: COLORS.text, lineHeight: 36, marginTop: 2, marginBottom: 14 },

  toolbar: { flexDirection: 'row', gap: 10 },
  search:  {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 15,
  },

  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:     {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.borderWarm,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  name:       { fontSize: 16, fontWeight: '800', color: COLORS.text },
  meta:       { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  empty:      { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
