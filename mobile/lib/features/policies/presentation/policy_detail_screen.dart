import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/format.dart';
import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-13 + F-15: rain meter per phase with payout ticks, and every payout with its reason (FR-43).
class PolicyDetailScreen extends ConsumerWidget {
  const PolicyDetailScreen({super.key, required this.id});
  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = ref.watch(sessionProvider).locale;
    final policy = ref.watch(policyProvider(id));

    return Scaffold(
      appBar: AppBar(),
      body: policy.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(policyProvider(id))),
        data: (data) {
          final p = data.$1;
          final phases = (p['phases'] as List).cast<Json>();
          final events = (p['triggerEvents'] as List).cast<Json>();
          final indexType = p['indexType'] as String? ?? 'DROUGHT_RAIN_DEFICIT';
          final drought = indexType == 'DROUGHT_RAIN_DEFICIT';
          return RefreshIndicator(
            onRefresh: () => ref.refresh(policyProvider(id).future),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(Tokens.s6, 0, Tokens.s6, Tokens.s8),
              children: [
                if (data.$2) const OfflineBanner(),
                Text(localName(p['names'], lang), style: theme.textTheme.headlineMedium),
                const SizedBox(height: Tokens.s1),
                Text(t.policyNumber(p['policyNumber'] as String), style: theme.textTheme.bodyMedium),
                const SizedBox(height: Tokens.s6),
                Row(children: [
                  _Stat(label: t.coverAmount, value: rupees(p['sumInsuredPaise'] as num)),
                  _Stat(label: t.paidOut, value: rupees(p['paidOutPaise'] as num)),
                ]),
                const SizedBox(height: Tokens.s6),
                for (final phase in phases) ...[
                  SectionCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(child: Text(t.phaseName(phase['phaseId'] as String), style: theme.textTheme.titleMedium)),
                        Text('${shortDate(phase['from'] as String, lang)} – ${shortDate(phase['to'] as String, lang)}', style: theme.textTheme.labelMedium),
                      ]),
                      const SizedBox(height: Tokens.s4),
                      if (phase['state'] == 'UPCOMING')
                        Text(t.phaseUpcoming(shortDate(phase['from'] as String, lang)), style: theme.textTheme.bodyMedium)
                      else ...[
                        RainMeter(phase: phase, indexType: indexType, slabs: p['slabs'] as List),
                        if (phase['nextThreshold'] != null) ...[
                          const SizedBox(height: Tokens.s2),
                          Text(
                            t.nextPayoutAt(drought
                                ? t.belowNormal(num1(phase['nextThreshold'] as num))
                                : '${num1(phase['nextThreshold'] as num)} mm'),
                            style: theme.textTheme.bodyMedium,
                          ),
                        ],
                      ],
                    ]),
                  ),
                  const SizedBox(height: Tokens.s3),
                ],
                const SizedBox(height: Tokens.s4),
                Text(t.payouts, style: theme.textTheme.titleLarge),
                const SizedBox(height: Tokens.s3),
                if (events.isEmpty)
                  Text(t.noPayouts, style: theme.textTheme.bodyMedium)
                else
                  for (final e in events) ...[
                    SectionCard(
                      child: Row(children: [
                        const Icon(Icons.payments_outlined, color: Tokens.accent, size: 28),
                        const SizedBox(width: Tokens.s3),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(rupees(e['payoutAmountPaise'] as num), style: theme.textTheme.titleLarge),
                            Text(
                              '${t.phaseName(e['phaseId'] as String)}  ·  ${drought ? t.belowNormal(num1(e['indexValue'] as num)) : '${num1(e['indexValue'] as num)} mm'}',
                              style: theme.textTheme.bodyMedium,
                            ),
                            const SizedBox(height: Tokens.s1),
                            StatusChip(
                              label: t.payoutStatus(e['payoutStatus'] as String? ?? ''),
                              icon: e['payoutStatus'] == 'SUCCESS' ? Icons.check_circle_outline : Icons.schedule,
                              color: Tokens.accent,
                            ),
                          ]),
                        ),
                      ]),
                    ),
                    const SizedBox(height: Tokens.s3),
                  ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: theme.textTheme.labelMedium),
        Text(value, style: theme.textTheme.headlineMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
    );
  }
}
