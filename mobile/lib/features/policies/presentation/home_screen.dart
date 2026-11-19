import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-07: the farmer's covers at a glance. Cached data shows first; offline is normal (NFR-04).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final policies = ref.watch(policiesProvider);
    final me = ref.watch(meProvider).value?.$1;
    final offline = ref.watch(onlineProvider).value == false || (policies.value?.$2 ?? false);

    Future<void> refresh() async {
      ref.invalidate(policiesProvider);
      ref.invalidate(meProvider);
      await ref.read(policiesProvider.future).then((_) {}, onError: (_) {});
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(t.homeTitle),
        actions: [
          IconButton(
            tooltip: t.logout,
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(sessionProvider).logout(),
          ),
        ],
      ),
      body: Column(children: [
        if (offline) const OfflineBanner(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: refresh,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(Tokens.s6, Tokens.s2, Tokens.s6, Tokens.s6),
              children: [
                if (me?['name'] != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Tokens.s4),
                    child: Text(
                      '${me!['name']}  ·  ${me['farmerCode']}${me['wallet'] == null ? '' : '  ·  ${(me['wallet'] as Json)['handleMasked']}'}',
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                ...policies.when(
                  loading: () => [const LoadingView()],
                  error: (e, _) => [ErrorView(error: e, onRetry: refresh)],
                  data: (data) => data.$1.isEmpty
                      ? [
                          EmptyState(
                            icon: Icons.water_drop_outlined,
                            title: t.emptyTitle,
                            body: t.emptyBody,
                            action: AppButton(label: t.buyCover, icon: Icons.add, onPressed: () => context.push('/cover/crop')),
                          ),
                        ]
                      : [
                          for (final p in data.$1.cast<Json>()) ...[
                            PolicyCard(policy: p, onTap: () => context.push('/policy/${p['id']}')),
                            const SizedBox(height: Tokens.s4),
                          ],
                        ],
                ),
              ],
            ),
          ),
        ),
      ]),
      floatingActionButton: (policies.value?.$1.isNotEmpty ?? false)
          ? FloatingActionButton.extended(
              onPressed: () => context.push('/cover/crop'),
              icon: const Icon(Icons.add),
              label: Text(t.buyCover, style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.onPrimary)),
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
            )
          : null,
    );
  }

}

/// One cover: crop + product, status, the rain meter for the current phase, money figures.
class PolicyCard extends ConsumerWidget {
  const PolicyCard({super.key, required this.policy, this.onTap});
  final Json policy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = ref.watch(sessionProvider).locale;
    final phases = (policy['phases'] as List).cast<Json>();
    final current = phases.lastWhere((p) => p['state'] != 'UPCOMING', orElse: () => phases.isEmpty ? <String, dynamic>{} : phases.first);
    final events = (policy['triggerEvents'] as List).cast<Json>();
    final active = policy['status'] == 'ACTIVE';

    return SectionCard(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(localName(policy['names'], lang), style: theme.textTheme.titleLarge),
              Text('${policy['policyNumber']}', style: theme.textTheme.labelMedium),
            ]),
          ),
          StatusChip(
            label: active ? t.statusActive : t.statusWaiting,
            icon: active ? Icons.check_circle_outline : Icons.schedule,
            color: active ? Tokens.accent : theme.colorScheme.onSurfaceVariant,
          ),
        ]),
        if (events.isNotEmpty) ...[
          const SizedBox(height: Tokens.s4),
          _PayoutBanner(event: events.first),
        ],
        if (current.isNotEmpty && current['state'] != 'UPCOMING') ...[
          const SizedBox(height: Tokens.s5),
          RainMeter(phase: current, indexType: policy['indexType'] as String, slabs: policy['slabs'] as List, compact: true),
          const SizedBox(height: Tokens.s1),
          Text(t.phaseName(current['phaseId'] as String), style: theme.textTheme.labelMedium),
        ],
        const Padding(padding: EdgeInsets.symmetric(vertical: Tokens.s4), child: Divider()),
        Row(children: [
          _Figure(label: t.coverAmount, value: rupees(policy['sumInsuredPaise'] as num)),
          _Figure(label: t.paidOut, value: rupees(policy['paidOutPaise'] as num)),
        ]),
      ]),
    );
  }
}

class _PayoutBanner extends StatelessWidget {
  const _PayoutBanner({required this.event});
  final Json event;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(Tokens.s3),
      decoration: BoxDecoration(color: Tokens.accent.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(Tokens.radiusControl)),
      child: Row(children: [
        const Icon(Icons.payments_outlined, color: Tokens.accent),
        const SizedBox(width: Tokens.s3),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.payoutOnTheWay(rupees(event['payoutAmountPaise'] as num)), style: theme.textTheme.titleMedium),
            Text(t.payoutStatus(event['payoutStatus'] as String? ?? ''), style: theme.textTheme.bodyMedium),
          ]),
        ),
      ]),
    );
  }
}

class _Figure extends StatelessWidget {
  const _Figure({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: theme.textTheme.labelMedium),
        Text(value, style: theme.textTheme.titleLarge?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
    );
  }
}
