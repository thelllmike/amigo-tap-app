package expo.modules.amigohce

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * Makes the phone look like an NFC Forum Type 4 tag holding one NDEF message,
 * so any phone that taps it (Android, or iPhone XS and later) opens the link
 * exactly as it would from a sticker or card.
 *
 * The reader walks the standard sequence: select the NDEF application, select
 * and read the Capability Container (E103), then select and read the NDEF file
 * (E104). See NFC Forum Type 4 Tag Technical Specification 2.0.
 */
class AmigoHceService : HostApduService() {
  private var appSelected = false
  private var selectedFile: ByteArray? = null
  private var ndefSelected = false

  override fun processCommandApdu(apdu: ByteArray, extras: Bundle?): ByteArray {
    val ndefFile = HceStore.ndefFile(this) ?: return SW_FILE_NOT_FOUND
    if (apdu.size < 4) return SW_WRONG_LENGTH

    val ins = apdu[1]
    val p1 = apdu[2].toInt() and 0xFF
    val p2 = apdu[3].toInt() and 0xFF

    return when {
      ins == INS_SELECT && p1 == 0x04 -> {
        if (dataOf(apdu).contentEquals(NDEF_AID)) {
          appSelected = true
          selectedFile = null
          ndefSelected = false
          SW_OK
        } else {
          SW_FILE_NOT_FOUND
        }
      }

      ins == INS_SELECT && p1 == 0x00 -> {
        if (!appSelected) return SW_FILE_NOT_FOUND
        when {
          dataOf(apdu).contentEquals(CC_FILE_ID) -> { selectedFile = capabilityContainer(ndefFile.size); ndefSelected = false; SW_OK }
          dataOf(apdu).contentEquals(NDEF_FILE_ID) -> { selectedFile = ndefFile; ndefSelected = true; SW_OK }
          else -> SW_FILE_NOT_FOUND
        }
      }

      ins == INS_READ_BINARY -> {
        val file = selectedFile ?: return SW_FILE_NOT_FOUND
        val offset = ((p1 and 0x7F) shl 8) or p2
        if (offset > file.size) return SW_WRONG_OFFSET
        val requested = if (apdu.size > 4) (apdu[4].toInt() and 0xFF).let { if (it == 0) 256 else it } else 256
        val end = minOf(offset + requested, file.size)
        // The whole NDEF file has been handed over: tell JS the tap worked.
        if (ndefSelected && end == file.size && offset < end) HceEvents.notifyRead()
        file.copyOfRange(offset, end) + SW_OK
      }

      else -> SW_INS_NOT_SUPPORTED
    }
  }

  override fun onDeactivated(reason: Int) {
    appSelected = false
    selectedFile = null
    ndefSelected = false
  }

  /** Lc-prefixed data field of a command APDU, or empty. */
  private fun dataOf(apdu: ByteArray): ByteArray {
    if (apdu.size < 5) return ByteArray(0)
    val lc = apdu[4].toInt() and 0xFF
    if (apdu.size < 5 + lc) return ByteArray(0)
    return apdu.copyOfRange(5, 5 + lc)
  }

  private fun capabilityContainer(ndefFileSize: Int): ByteArray {
    val max = maxOf(ndefFileSize, 0x80)
    return byteArrayOf(
      0x00, 0x0F, // CC length
      0x20, // mapping version 2.0
      0x00, 0x7F, // MLe: max bytes per READ BINARY response
      0x00, 0x7F, // MLc: max bytes per UPDATE BINARY command
      0x04, 0x06, // NDEF File Control TLV
      0xE1.toByte(), 0x04, // NDEF file id
      (max shr 8).toByte(), (max and 0xFF).toByte(), // max NDEF file size
      0x00, // read access: granted
      0xFF.toByte(), // write access: none
    )
  }

  companion object {
    private const val INS_SELECT: Byte = 0xA4.toByte()
    private const val INS_READ_BINARY: Byte = 0xB0.toByte()

    private val NDEF_AID = byteArrayOf(0xD2.toByte(), 0x76, 0x00, 0x00, 0x85.toByte(), 0x01, 0x01)
    private val CC_FILE_ID = byteArrayOf(0xE1.toByte(), 0x03)
    private val NDEF_FILE_ID = byteArrayOf(0xE1.toByte(), 0x04)

    private val SW_OK = byteArrayOf(0x90.toByte(), 0x00)
    private val SW_FILE_NOT_FOUND = byteArrayOf(0x6A, 0x82.toByte())
    private val SW_WRONG_LENGTH = byteArrayOf(0x67, 0x00)
    private val SW_WRONG_OFFSET = byteArrayOf(0x6B, 0x00)
    private val SW_INS_NOT_SUPPORTED = byteArrayOf(0x6D, 0x00)
  }
}
