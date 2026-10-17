package expo.modules.amigohce

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.cardemulation.CardEmulation
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AmigoHceModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val component: ComponentName
    get() = ComponentName(context, AmigoHceService::class.java)

  override fun definition() = ModuleDefinition {
    Name("AmigoHce")

    Events("onRead")

    OnCreate {
      HceEvents.listener = { sendEvent("onRead", emptyMap<String, Any>()) }
    }

    OnDestroy {
      HceEvents.listener = null
      // Never leave the phone answering readers after the app goes away.
      runCatching { setServiceEnabled(false) }
    }

    /** True when the phone can emulate a card (has NFC + HCE). */
    Function("isSupported") {
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    }

    /** True when NFC is switched on in system settings. */
    Function("isNfcEnabled") {
      NfcAdapter.getDefaultAdapter(context)?.isEnabled == true
    }

    /** Starts answering NFC readers with an NDEF tag that holds `url`. */
    AsyncFunction("start") { url: String ->
      HceStore.save(context, url)
      setServiceEnabled(true)
      preferWhileForeground(true)
    }

    AsyncFunction("stop") {
      preferWhileForeground(false)
      setServiceEnabled(false)
      HceStore.clear(context)
    }

    Function("openNfcSettings") {
      val intent = Intent(Settings.ACTION_NFC_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
  }

  private fun setServiceEnabled(enabled: Boolean) {
    val state = if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    context.packageManager.setComponentEnabledSetting(component, state, PackageManager.DONT_KILL_APP)
  }

  /**
   * Another app may register the same Type 4 AID (NFC Tools does). Asking to be
   * the preferred service while our screen is open avoids the system chooser.
   */
  private fun preferWhileForeground(prefer: Boolean) {
    val adapter = NfcAdapter.getDefaultAdapter(context) ?: return
    val activity = appContext.currentActivity ?: return
    val emulation = CardEmulation.getInstance(adapter)
    runCatching {
      if (prefer) emulation.setPreferredService(activity, component) else emulation.unsetPreferredService(activity)
    }
  }
}
