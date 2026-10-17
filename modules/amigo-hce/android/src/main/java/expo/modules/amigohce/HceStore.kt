package expo.modules.amigohce

import android.content.Context
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.util.Base64

/**
 * The NDEF file the service serves. Kept in SharedPreferences because Android
 * starts HostApduService on its own when a reader appears, possibly before or
 * without the React Native runtime.
 */
internal object HceStore {
  private const val PREFS = "amigo_hce"
  private const val KEY_NDEF = "ndef_file"

  fun save(context: Context, url: String) {
    val message = NdefMessage(NdefRecord.createUri(url)).toByteArray()
    // NDEF file = 2-byte length (NLEN) followed by the message.
    val file = byteArrayOf((message.size shr 8).toByte(), (message.size and 0xFF).toByte()) + message
    prefs(context).edit().putString(KEY_NDEF, Base64.encodeToString(file, Base64.NO_WRAP)).apply()
  }

  fun clear(context: Context) {
    prefs(context).edit().remove(KEY_NDEF).apply()
  }

  fun ndefFile(context: Context): ByteArray? =
    prefs(context).getString(KEY_NDEF, null)?.let { Base64.decode(it, Base64.NO_WRAP) }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

/** Bridges "a reader just read the tag" from the service to the JS module. */
internal object HceEvents {
  @Volatile var listener: (() -> Unit)? = null

  fun notifyRead() {
    listener?.invoke()
  }
}
