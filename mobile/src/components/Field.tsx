import { Text, View } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';

import { COLORS } from '../lib/theme';

interface Props {
  label:         string;
  value:         string;
  onChangeText:  (v: string) => void;
  placeholder?:  string;
  multiline?:    boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' | 'decimal-pad';
}

export default function Field({
  label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default',
}: Props) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color:          COLORS.textMuted,
          marginBottom:   8,
          fontSize:       11,
          letterSpacing:  0.5,
          fontWeight:     '700',
          textTransform:  'uppercase',
        }}
      >
        {label}
      </Text>
      <PaperInput
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        dense={!multiline}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        activeOutlineColor={COLORS.primary}
        outlineColor={COLORS.border}
        textColor={COLORS.text}
        theme={{ colors: { onSurfaceVariant: COLORS.textLight } }}
        style={{
          borderRadius:   14,
          fontSize:       15,
          backgroundColor: COLORS.card,
          minHeight:      multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}
