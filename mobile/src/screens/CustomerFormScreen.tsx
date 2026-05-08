import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import Field         from '../components/Field';
import PrimaryButton from '../components/PrimaryButton';
import { api } from '../lib/api';
import { COLORS } from '../lib/theme';

export default function CustomerFormScreen({ navigation }: any) {
  const [full_name, setName]   = useState('');
  const [phone, setPhone]      = useState('');
  const [email, setEmail]      = useState('');
  const [address, setAddress]  = useState('');
  const [notes, setNotes]      = useState('');
  const [preferences, setPref] = useState('');
  const [saving, setSaving]    = useState(false);

  const submit = async () => {
    if (!full_name.trim()) { Alert.alert('Required', 'Full name is required.'); return; }
    setSaving(true);
    try {
      await api.post('/customers/', {
        full_name:   full_name.trim(),
        phone:       phone.trim()   || null,
        email:       email.trim()   || null,
        address:     address.trim() || null,
        notes:       notes.trim()   || null,
        preferences: preferences.trim() || null,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Register customer</Text>
      <Text style={styles.subtitle}>Fill in the details, then create an order for this customer.</Text>
      <View style={{ height: 20 }} />

      <Field label="Full name *"  value={full_name}    onChangeText={setName}    placeholder="Maria Silva" />
      <Field label="Phone"        value={phone}         onChangeText={setPhone}   placeholder="+34 …"          keyboardType="phone-pad" />
      <Field label="Email"        value={email}         onChangeText={setEmail}   placeholder="name@example.com" keyboardType="email-address" />
      <Field label="Address"      value={address}       onChangeText={setAddress} placeholder="Street, city" />
      <Field label="Preferences"  value={preferences}   onChangeText={setPref}    placeholder="Slim fit, dark colours" multiline />
      <Field label="Notes"        value={notes}         onChangeText={setNotes}   placeholder="Internal notes" multiline />

      <PrimaryButton title="Save customer" onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  title:     { fontSize: 24, fontWeight: '900', fontStyle: 'italic', color: COLORS.text },
  subtitle:  { fontSize: 14, color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
});
