import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { C, F, R, type } from '@/constants/theme';

interface FieldProps extends TextInputProps {
  label?: string;
  /** Right-aligned next to the label, e.g. "Forgot password?" or a character count. */
  labelAccessory?: ReactNode;
  error?: string | null;
  /** Helper line under the field when there's no error. */
  hint?: ReactNode;
  /** Fixed text on the left, e.g. "+94" or "amigotap.com/linktree/". */
  prefix?: string;
  right?: ReactNode;
  multiline?: boolean;
  mono?: boolean;
}

/** 52 px input with default, focus (lime ring), error and disabled states. */
export function Field({ label, labelAccessory, error, hint, prefix, right, multiline, mono, editable = true, style, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const border = error ? C.danger : focused ? C.accent : C.border;
  return (
    <View style={styles.wrap}>
      {(label || labelAccessory) && (
        <View style={styles.labelRow}>
          {label ? <Text style={[type.label, error && { color: C.danger }]}>{label}</Text> : <View />}
          {labelAccessory}
        </View>
      )}
      <View
        style={[
          styles.box,
          { borderColor: border, backgroundColor: editable ? C.card : C.bg, minHeight: multiline ? 100 : 52 },
          focused && !error && styles.glow,
        ]}>
        {prefix && (
          <View style={[styles.prefix, prefix.length <= 4 && styles.prefixBox]}>
            <Text style={[styles.prefixText, prefix.length > 4 && { fontFamily: F.mono, fontSize: 13 }]}>{prefix}</Text>
          </View>
        )}
        <TextInput
          {...rest}
          editable={editable}
          multiline={multiline}
          placeholderTextColor={C.muted}
          selectionColor={C.accent}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[
            styles.input,
            mono && { fontFamily: F.monoBold },
            multiline && { textAlignVertical: 'top', paddingTop: 14, paddingBottom: 14 },
            !editable && { color: C.muted },
            style,
          ]}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : typeof hint === 'string' ? <Text style={type.caption}>{hint}</Text> : hint}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: R.input, overflow: 'hidden' },
  glow: { shadowColor: C.accent, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  input: { flex: 1, fontFamily: F.sans, fontSize: 17, color: C.text, paddingHorizontal: 16, paddingVertical: 14 },
  prefix: { paddingLeft: 16 },
  prefixBox: { paddingHorizontal: 16, alignSelf: 'stretch', justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.border },
  prefixText: { fontFamily: F.sans, fontSize: 17, color: C.muted },
  error: { fontFamily: F.sans, fontSize: 14, color: C.danger },
});
