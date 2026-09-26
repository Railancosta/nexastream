package org.nexastream.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.nexastream.app.ui.UploadViewModel
import org.nexastream.app.ui.theme.NsAccent
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.ui.theme.NsPrimary
import org.nexastream.app.ui.theme.NsSuccess
import org.nexastream.app.util.SizeFormat

@Composable
fun UploadScreen(
    onSignIn: () -> Unit,
    viewModel: UploadViewModel = viewModel(),
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    val busy by viewModel.busy.collectAsStateWithLifecycle()
    val progress by viewModel.progress.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val result by viewModel.result.collectAsStateWithLifecycle()

    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var isShort by remember { mutableStateOf(false) }
    var selectedName by remember { mutableStateOf<String?>(null) }
    var selectedSize by remember { mutableStateOf(0L) }
    var bytes by remember { mutableStateOf<ByteArray?>(null) }

    val picker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument(),
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            // Read on IO: the picker can hand back a multi-hundred-MB file.
            val loaded = withContext(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                }.getOrNull()
            }
            if (loaded == null) {
                selectedName = null
                bytes = null
                return@launch
            }
            bytes = loaded
            selectedSize = loaded.size.toLong()
            selectedName = uri.lastPathSegment?.substringAfterLast('/') ?: "selected.mp4"
            if (title.isBlank()) title = selectedName.orEmpty().substringBeforeLast('.')
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Publish",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "Shorts are detected automatically (≤60s or vertical). Transcoding to " +
                "360p/720p/1080p starts as soon as the upload completes.",
            style = MaterialTheme.typography.bodySmall,
            color = NsMuted,
        )

        if (!viewModel.isLoggedIn) {
            Text(
                text = "You need an account to publish.",
                style = MaterialTheme.typography.bodyMedium,
                color = NsAccent,
            )
            Button(onClick = onSignIn) { Text("Sign in") }
        }

        OutlinedButton(
            onClick = { picker.launch(arrayOf("video/*")) },
            enabled = !busy,
        ) {
            Text(if (selectedName == null) "Choose a video file" else "Change file")
        }

        if (selectedName != null) {
            Text(
                text = "$selectedName · ${SizeFormat.human(selectedSize)}",
                style = MaterialTheme.typography.bodySmall,
                color = NsMuted,
            )
        }

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Title") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description") },
            minLines = 3,
            modifier = Modifier.fillMaxWidth(),
        )

        Row(verticalAlignment = Alignment.CenterVertically) {
            Switch(checked = isShort, onCheckedChange = { isShort = it })
            Text(
                text = "Publish as a Short",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(start = 10.dp),
            )
        }

        if (busy) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = "${(progress * 100).toInt()}% uploaded",
                style = MaterialTheme.typography.labelSmall,
                color = NsMuted,
            )
        }

        if (error != null) {
            Text(
                text = error!!,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
            )
        }

        if (result != null) {
            Text(
                text = "Upload accepted (id ${result!!.take(8)}…). Processing has started; " +
                    "it will appear in the feed when transcoding finishes.",
                style = MaterialTheme.typography.bodySmall,
                color = NsSuccess,
            )
        }

        Button(
            onClick = {
                viewModel.upload(bytes ?: ByteArray(0), title, description, isShort)
            },
            enabled = !busy && bytes != null && viewModel.isLoggedIn,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (busy) "Uploading…" else "Publish")
        }

        Text(
            text = "Only upload content you own or have the rights to distribute. " +
                "Ownership of a token does not imply copyright ownership (Item 19).",
            style = MaterialTheme.typography.labelSmall,
            color = NsMuted,
            modifier = Modifier.padding(top = 6.dp),
        )
    }
}
