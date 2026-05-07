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

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { Customer, Paged, api } from '../lib/api';
import { COLORS } from '../lib/theme';

export default function CustomersScreen({ navigation }: any) {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Paged<Customer>>('/customers/', { search });
      setItems(data.results);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
          placeholder="Search customers..."
          placeholderTextColor="#94a3b8"
          style={styles.search}
        />
        <PrimaryButton
          title="+ New"
          onPress={() => navigation.navigate('CustomerForm')}
          style={{ paddingHorizontal: 18 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No customers yet. Tap "+ New" to add one.</Text>
          }
          renderItem={({ item }) => (
            <Card>
              <Text style={styles.name}>{item.full_name}</Text>
              {item.email  ? <Text style={styles.meta}>{item.email}</Text>  : null}
              {item.phone  ? <Text style={styles.meta}>{item.phone}</Text>  : null}
              {item.notes  ? <Text style={[styles.meta, { marginTop: 6 }]}>{item.notes}</Text> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  toolbar:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: COLORS.background },
  search:    {
    flex: 1, backgroundColor: '#ffffff', borderColor: COLORS.border,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    color: COLORS.text,
  },
  name: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
});
