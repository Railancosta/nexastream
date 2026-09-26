package org.nexastream.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.nexastream.app.monetization.formatNst
import org.nexastream.app.ui.components.ErrorState
import org.nexastream.app.ui.Load
import org.nexastream.app.ui.MonetizationViewModel
import org.nexastream.app.ui.components.CenteredLoading
import org.nexastream.app.ui.components.EmptyState
import org.nexastream.app.ui.theme.NsAccent
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.ui.theme.NsPrimary
import org.nexastream.app.ui.theme.NsSuccess
import org.nexastream.app.ui.theme.NsSurfaceHigh
import org.nexastream.app.util.TimeFormat

@Composable
fun WalletScreen(
    onOpenStudio: () -> Unit,
    onSignIn: () -> Unit,
    viewModel: MonetizationViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val wallet by viewModel.wallet.collectAsStateWithLifecycle()
    val config by viewModel.config.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val payoutBusy by viewModel.payoutBusy.collectAsStateWithLifecycle()

    var amount by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var memo by remember { mutableStateOf("") }
    var network by remember { mutableStateOf("NANO") }

    when (val s = state) {
        is Load.Loading -> CenteredLoading()
        is Load.Failed -> ErrorState(s.message, onRetry = { onSignIn() })
        else -> {
            val w = wallet
            if (w == null) {
                EmptyState(
                    "Sign in to view your wallet",
                    "Balances, earnings and payouts appear here once you have an account.",
                )
                return
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = NsSurfaceHigh),
                        shape = RoundedCornerShape(18.dp),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Brush.linearGradient(
                                        listOf(NsPrimary.copy(alpha = 0.35f), NsAccent.copy(alpha = 0.20f)),
                                    ),
                                )
                                .padding(20.dp),
                        ) {
                            Text("Available balance", style = MaterialTheme.typography.labelMedium, color = NsMuted)
                            Text(
                                text = formatNst(w.balanceNst),
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Row(
                                modifier = Modifier.padding(top = 14.dp),
                                horizontalArrangement = Arrangement.spacedBy(24.dp),
                            ) {
                                Metric("Creator earned", formatNst(w.lifetimeCreatorNst))
                                Metric("Viewer earned", formatNst(w.lifetimeViewerNst))
                                Metric("Paid out", formatNst(w.lifetimePaidNst))
                            }
                        }
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = onOpenStudio) { Text("Creator Studio") }
                        Button(onClick = { viewModel.refresh() }) { Text("Refresh") }
                    }
                }

                if (message != null) {
                    item {
                        Text(
                            text = message!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = NsAccent,
                        )
                    }
                }

                if (w.earningsByKind.isNotEmpty()) {
                    item {
                        SectionHeader("Earnings by source")
                    }
                    items(w.earningsByKind) { row ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                text = row.kind.replace('_', ' '),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            Text(
                                text = "${formatNst(row.nst)}  ·  ${row.events} events",
                                style = MaterialTheme.typography.bodySmall,
                                color = NsMuted,
                            )
                        }
                    }
                }

                item { HorizontalDivider(modifier = Modifier.padding(vertical = 6.dp)) }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        SectionHeader("Request a payout")
                        Text(
                            text = "Payouts are settled on testnet. Requests are recorded and " +
                                "audited; nothing is broadcast automatically.",
                            style = MaterialTheme.typography.bodySmall,
                            color = NsMuted,
                        )
                        OutlinedTextField(
                            value = amount,
                            onValueChange = { amount = it },
                            label = { Text("Amount (NST)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items((config?.networks ?: listOf("NANO", "BTC", "ETH", "USDC"))) { net ->
                                FilterChip(
                                    selected = network == net,
                                    onClick = { network = net },
                                    label = { Text(net) },
                                )
                            }
                        }
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text("Destination address") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        if (config?.memoNetworks?.contains(network) == true) {
                            OutlinedTextField(
                                value = memo,
                                onValueChange = { memo = it },
                                label = { Text("Destination tag / memo (required by this network)") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                        Button(
                            onClick = {
                                viewModel.requestPayout(
                                    amount.toDoubleOrNull() ?: 0.0,
                                    address,
                                    network,
                                    memo.takeIf { it.isNotBlank() },
                                )
                            },
                            enabled = !payoutBusy,
                        ) {
                            Text(if (payoutBusy) "Submitting…" else "Request payout")
                        }
                        Text(
                            text = "Minimum ${config?.minPayoutNst ?: 100.0} NST · payouts above " +
                                "${org.nexastream.app.monetization.formatNst(
                                    org.nexastream.app.monetization.RewardRates.HIGH_VALUE_TIMELOCK_NST,
                                )} carry a ${config?.timelockHours ?: 24}h review window",
                            style = MaterialTheme.typography.labelSmall,
                            color = NsMuted,
                        )
                    }
                }

                if (w.payouts.isNotEmpty()) {
                    item { SectionHeader("Payout history") }
                    items(w.payouts) { p ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text(formatNst(p.amountNst), style = MaterialTheme.typography.bodyMedium)
                                Text(
                                    text = "${p.destNetwork} · ${p.destAddress.take(14)}…",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = NsMuted,
                                )
                            }
                            Text(
                                text = p.status,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (p.status == "approved") NsSuccess else NsAccent,
                            )
                        }
                    }
                }

                if (w.recentLedger.isNotEmpty()) {
                    item { SectionHeader("Recent rewards") }
                    items(w.recentLedger) { entry ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Column {
                                Text(
                                    text = entry.kind.replace('_', ' '),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Text(
                                    text = "${entry.role} · ${TimeFormat.relative(entry.createdAt)}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = NsMuted,
                                )
                            }
                            Text(
                                text = formatNst(entry.nst),
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (entry.status == "credited") NsSuccess else NsMuted,
                            )
                        }
                    }
                }

                if (config != null) {
                    item {
                        Text(
                            text = "Rate table ${config!!.ratesVersion} · split " +
                                "${(config!!.creatorSplit * 100).toInt()}/" +
                                "${(config!!.platformSplit * 100).toInt()} creator/platform",
                            style = MaterialTheme.typography.labelSmall,
                            color = NsMuted,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(top = 4.dp),
    )
}

@Composable
private fun Metric(label: String, value: String) {
    Column {
        Text(text = value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = NsMuted)
    }
}

@Composable
fun StudioScreen(
    onOpenVideo: (String) -> Unit,
    viewModel: MonetizationViewModel = viewModel(),
) {
    val studio by viewModel.studio.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (val s = state) {
        is Load.Loading -> CenteredLoading()
        is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.refresh() })
        else -> {
            val data = studio
            if (data == null) {
                EmptyState("No studio data", "Publish a video to start earning.")
                return
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    Text(
                        text = "Creator Studio",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Unit economics for your channel (Item 33)",
                        style = MaterialTheme.typography.bodySmall,
                        color = NsMuted,
                    )
                }
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = NsSurfaceHigh),
                        shape = RoundedCornerShape(16.dp),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = formatNst(data.totals.earnedNst),
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = NsSuccess,
                            )
                            Text("Total earned", style = MaterialTheme.typography.labelSmall, color = NsMuted)
                            Row(
                                modifier = Modifier.padding(top = 14.dp),
                                horizontalArrangement = Arrangement.spacedBy(20.dp),
                            ) {
                                Metric("Views", TimeFormat.compact(data.totals.views))
                                Metric("Likes", TimeFormat.compact(data.totals.likes))
                                Metric("Watch h", data.totals.watchHours.toString())
                            }
                            Row(
                                modifier = Modifier.padding(top = 12.dp),
                                horizontalArrangement = Arrangement.spacedBy(20.dp),
                            ) {
                                Metric("Per 1K views", formatNst(data.totals.revenuePerThousandViewsNst))
                                Metric("Per view", formatNst(data.totals.revenuePerViewNst))
                                Metric(
                                    "Completion",
                                    "${(data.totals.completionRate * 100).toInt()}%",
                                )
                            }
                        }
                    }
                }
                item { SectionHeader("Per video") }
                if (data.videos.isEmpty()) {
                    item {
                        Text(
                            text = "No published videos yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = NsMuted,
                        )
                    }
                }
                items(data.videos) { v ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column(modifier = Modifier.fillMaxWidth(0.68f)) {
                            Text(
                                text = v.title,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                maxLines = 1,
                            )
                            Text(
                                text = "${TimeFormat.compact(v.views)} views · " +
                                    "${TimeFormat.compact(v.likes)} likes · " +
                                    (if (v.isShort) "Short" else "Video"),
                                style = MaterialTheme.typography.labelSmall,
                                color = NsMuted,
                            )
                        }
                        Box(contentAlignment = Alignment.CenterEnd) {
                            Text(
                                text = formatNst(v.earnedNst),
                                style = MaterialTheme.typography.bodyMedium,
                                color = NsSuccess,
                            )
                        }
                    }
                }
            }
        }
    }
}
