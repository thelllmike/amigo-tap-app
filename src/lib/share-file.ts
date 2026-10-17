import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Writes a file to the cache and opens the share sheet, so the owner can save
 * it to Photos/Files, AirDrop it or send it to a printer.
 */
export async function shareFile(name: string, content: string, opts: { base64?: boolean; mimeType: string; uti?: string }) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(content, { encoding: opts.base64 ? 'base64' : 'utf8' });
  await Sharing.shareAsync(file.uri, { mimeType: opts.mimeType, UTI: opts.uti, dialogTitle: name });
}
