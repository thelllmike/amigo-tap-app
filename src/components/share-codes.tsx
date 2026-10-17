import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Check, Copy, Download, Nfc, Share as ShareIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { QrCode, type QrHandle } from '@/components/qr-code';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/surface';
import { C, F, R, type } from '@/constants/theme';
import { displayUrl } from '@/lib/links';
import { nfcSupported, writeLink } from '@/lib/nfc';
import { qrSvg } from '@/lib/qr';
import { shareFile } from '@/lib/share-file';

type Format = 'png' | 'svg';

/**
 * The page's QR code in the AmigoTap design with PNG/SVG export, plus the NFC
 * tag link and — new in the app — writing that link straight to a tag.
 */
export function ShareCodes({ title, qrValue, nfcValue, fileName }: { title: string; qrValue: string; nfcValue: string; fileName: string }) {
  const qr = useRef<QrHandle>(null);
  const [format, setFormat] = useState<Format>('png');
  const [copied, setCopied] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    void nfcSupported().then(setCanWrite);
  }, []);

  async function download() {
    try {
      if (format === 'svg') {
        await shareFile(`${fileName}.svg`, qrSvg(qrValue), { mimeType: 'image/svg+xml', uti: 'public.svg-image' });
      } else {
        const png = await qr.current?.toPngBase64(1000);
        if (!png) return;
        await shareFile(`${fileName}.png`, png, { base64: true, mimeType: 'image/png', uti: 'public.png' });
      }
    } catch (e) {
      Alert.alert('Couldn’t export the code', e instanceof Error ? e.message : '');
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(nfcValue);
    setCopied(true);
    void Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 1500);
  }

  async function write() {
    setWriting(true);
    const res = await writeLink(nfcValue);
    setWriting(false);
    if (res.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Tag written', 'Tap it with any phone to test — it opens your page with the welcome popup.');
    } else if (!res.cancelled) {
      Alert.alert('Couldn’t write the tag', res.message);
    }
  }

  return (
    <>
      <Card style={styles.qrCard}>
        <View style={styles.qrFrame}>
          <QrCode ref={qr} value={qrValue} size={260} />
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={styles.qrTitle}>{title}</Text>
          <Text style={styles.qrUrl}>{displayUrl(qrValue)}</Text>
        </View>
        <View style={styles.buttons}>
          <Button title="Download" icon={Download} onPress={download} flex />
          <Button title="Share" icon={ShareIcon} variant="outline" onPress={() => Share.share({ message: qrValue, url: qrValue })} flex />
        </View>
        <View style={styles.formats}>
          {(['png', 'svg'] as const).map((f) => (
            <Pressable key={f} onPress={() => setFormat(f)} style={[styles.format, format === f && styles.formatOn]} accessibilityRole="radio" accessibilityState={{ selected: format === f }}>
              <Text style={[styles.formatText, format === f && { color: C.onAccent }]}>{f.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 16, padding: 20 }}>
        <Text style={styles.cardTitle}>NFC tag link</Text>
        <View style={styles.copyRow}>
          <Text style={styles.copyText} numberOfLines={1}>
            {nfcValue}
          </Text>
          <Pressable onPress={copy} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel="Copy NFC link">
            {copied ? <Check size={18} color={C.accent} /> : <Copy size={18} color={C.text} />}
            <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        </View>

        {canWrite ? (
          <>
            <Button title="Write to an NFC tag" icon={Nfc} variant="outline" onPress={write} loading={writing} />
            <Text style={type.caption}>Hold the top of your phone to a blank AmigoTap card or stand until it buzzes. Tap it once to test.</Text>
          </>
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={type.label}>How to write it to a tag</Text>
            {[
              'Copy the link above and open an NFC writer app (NFC Tools works on iOS and Android).',
              'Choose Write › Add a record › URL, then paste the link.',
              'Hold the top of your phone to the card or stand until it buzzes. Tap it once to test.',
            ].map((step, i) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[type.body, { flex: 1, fontSize: 16, lineHeight: 23 }]}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  qrCard: { alignItems: 'center', gap: 20, padding: 24 },
  qrFrame: { padding: 14, backgroundColor: '#FFFFFF', borderRadius: 28 },
  qrTitle: { fontFamily: F.sansSemi, fontSize: 20, color: C.text },
  qrUrl: { fontFamily: F.mono, fontSize: 14, color: C.muted },
  buttons: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  formats: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start' },
  format: { paddingHorizontal: 14, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, justifyContent: 'center' },
  formatOn: { backgroundColor: C.text, borderColor: C.text },
  formatText: { fontFamily: F.monoBold, fontSize: 13, color: C.muted },
  cardTitle: { fontFamily: F.sansSemi, fontSize: 19, color: C.text },
  copyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: R.input, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, paddingLeft: 16, padding: 6, gap: 8 },
  copyText: { flex: 1, fontFamily: F.mono, fontSize: 14, color: C.text },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.border, paddingHorizontal: 16, height: 48, borderRadius: R.segment + 2 },
  copyBtnText: { fontFamily: F.sansSemi, fontSize: 16, color: C.text },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: F.monoBold, fontSize: 14, color: C.onAccent },
});
