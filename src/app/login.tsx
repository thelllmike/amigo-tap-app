import * as WebBrowser from 'expo-web-browser';
import { CircleAlert, Eye, EyeOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoTile } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/input';
import { T } from '@/components/ui/text';
import { C, F, R } from '@/constants/theme';
import { SITE_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';

const MAX_TRIES = 3;
const PAUSE_MS = 5 * 60_000;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [pausedUntil, setPausedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const paused = pausedUntil > now;
  useEffect(() => {
    if (!paused) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paused]);

  async function logIn() {
    if (paused || busy) return;
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!err) return; // The auth listener swaps the stack to the signed-in screens.
    if (/invalid login credentials/i.test(err.message)) {
      const tries = wrong + 1;
      setWrong(tries);
      if (tries >= MAX_TRIES) {
        setPausedUntil(Date.now() + PAUSE_MS);
        setNow(Date.now());
        setWrong(0);
      }
    } else {
      setError(err.message);
    }
  }

  async function forgot() {
    if (!email.trim()) {
      setError('Type your email first, then tap Forgot password.');
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${SITE_URL}/linktree/reset-password` });
    if (err) setError(err.message);
    else setNotice(`We sent a reset link to ${email.trim()}.`);
  }

  const passwordWrong = wrong > 0 && !error;
  const left = MAX_TRIES - wrong;
  const wait = Math.ceil((pausedUntil - now) / 1000);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        contentStyle={{ flexGrow: 1, paddingTop: 90 }}
        footer={
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to AmigoTap? </Text>
            <Pressable onPress={() => WebBrowser.openBrowserAsync(SITE_URL)} accessibilityRole="link">
              <Text style={[styles.footerText, { color: C.text, fontFamily: F.sansBold }]}>Get a card</Text>
            </Pressable>
          </View>
        }>
        <LogoTile size={76} />
        <View style={{ gap: 10 }}>
          <T v="display" style={{ fontSize: 34, lineHeight: 40 }}>
            Manage your AmigoTap
          </T>
          <T style={{ color: C.muted, fontSize: 17, lineHeight: 25 }}>Pages, live orders and stats for every business you run.</T>
        </View>

        {(passwordWrong || paused) && (
          <View style={styles.alert} accessibilityLiveRegion="polite">
            <CircleAlert size={22} color={C.danger} />
            <Text style={styles.alertText}>
              <Text style={{ fontFamily: F.sansBold }}>{paused ? 'Too many tries.' : 'That password doesn’t match.'}</Text>
              {'\n'}
              {paused
                ? `Wait ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')} or reset your password.`
                : `Check it and try again, or reset it. ${left} ${left === 1 ? 'try' : 'tries'} left before a 5-minute pause.`}
            </Text>
          </View>
        )}
        {notice && (
          <View style={[styles.alert, { borderColor: '#3D4A12', backgroundColor: '#1A1F0B' }]}>
            <Text style={[styles.alertText, { color: C.text }]}>{notice}</Text>
          </View>
        )}

        <View style={{ gap: 20 }}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            placeholder="you@business.lk"
            returnKeyType="next"
          />
          <Field
            label="Password"
            labelAccessory={
              <Pressable onPress={forgot} hitSlop={8} accessibilityRole="button">
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            }
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            secureTextEntry={!show}
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
            returnKeyType="go"
            onSubmitEditing={logIn}
            error={error ?? (passwordWrong ? 'Wrong password' : null)}
            right={
              <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} style={{ paddingHorizontal: 16 }} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={22} color={C.muted} /> : <Eye size={22} color={C.muted} />}
              </Pressable>
            }
          />
        </View>

        <Button title={busy ? 'Logging in…' : passwordWrong ? 'Try again' : 'Log in'} onPress={logIn} loading={busy} disabled={paused} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, flexDirection: 'row', justifyContent: 'center', paddingVertical: 8 },
  footerText: { fontFamily: F.sans, fontSize: 16, color: C.muted },
  forgot: { fontFamily: F.sansBold, fontSize: 15, color: C.accent },
  alert: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: R.input, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#1F1515' },
  alertText: { flex: 1, fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: '#D9D9D9' },
});
