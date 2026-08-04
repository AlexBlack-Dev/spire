package com.spire.notes

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.DocumentsContract
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : TauriActivity() {
    companion object {
        @Volatile private var pendingId = -1
        @Volatile private var resultUri: String? = null
        @Volatile private var resultReady = false
        private var appContext: android.content.Context? = null

        @JvmStatic fun isResultReady(): Boolean = resultReady
        @JvmStatic fun getResultUri(): String? = resultUri
        @JvmStatic fun resetResult() { resultReady = false; resultUri = null; pendingId = -1 }

        @JvmStatic
        fun writeToUri(uri: String, content: String): Boolean {
            val ctx = appContext ?: return false
            return try {
                val uriObj = Uri.parse(uri)
                ctx.contentResolver.openOutputStream(uriObj)?.use { stream ->
                    stream.write(content.toByteArray(Charsets.UTF_8))
                    stream.flush()
                } != null
            } catch (e: Exception) {
                android.util.Log.e("SPIRE", "writeToUri: ${e.message}")
                false
            }
        }

        @JvmStatic
        fun takePersistableUri(uriStr: String): Boolean {
            val ctx = appContext ?: return false
            return try {
                val uri = Uri.parse(uriStr)
                ctx.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                true
            } catch (e: Exception) {
                android.util.Log.e("SPIRE", "takePersistableUri: ${e.message}")
                false
            }
        }
    }

    private val saveLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result: ActivityResult ->
        val rc = pendingId
        if (rc >= 0) {
            resultUri = when (result.resultCode) {
                Activity.RESULT_OK -> result.data?.data?.toString()
                else -> ""
            }
            resultReady = true
        }
    }

    fun startSave(requestCode: Int, fileName: String) {
        pendingId = requestCode
        resultReady = false
        resultUri = null
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_TITLE, fileName)
        }
        saveLauncher.launch(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        appContext = applicationContext
    }
}
