import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

final _quotesProvider = FutureProvider.autoDispose.family<List<dynamic>, String>((ref, key) {
  final parts = key.split('|');
  return ref.watch(apiProvider).post<List<dynamic>>('/quotes', {'plotId': parts[0], 'cropCode': parts[1], 'seasonCode': parts[2]});
});

/// F-10: cover cards - price first, then the payout rule as gauge ticks in plain words (FR-13).
class QuoteScreen extends ConsumerStatefulWidget {
  const QuoteScreen({super.key, required this.args});
  final Json args;
  @override
  ConsumerState<QuoteScreen> createState() => _QuoteScreenState();
}

class _QuoteScreenState extends ConsumerState<QuoteScreen> {
  String? busyId;

  Future<void> choose(Json quote) async {
    setState(() => busyId = quote['productVersionId'] as String);
    try {
      final policy = await ref.read(apiProvider).post<Json>('/policies', {
        'productVersionId': quote['productVersionId'],
        'plotId': widget.args['plotId'],
        'cropCode': widget.args['cropCode'],
      });
      if (mounted) context.push('/cover/pay', extra: {'policy': policy, 'quote': quote});
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final key = '${widget.args['plotId']}|${widget.args['cropCode']}|${widget.args['seasonCode']}';
    final quotes = ref.watch(_quotesProvider(key));
    return StepScaffold(
      title: t.quoteTitle,
      body: quotes.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(_quotesProvider(key))),
        data: (list) => list.isEmpty
            ? EmptyState(icon: Icons.event_busy_outlined, title: t.emptyTitle, body: '')
            : Column(children: [
                for (final q in list.cast<Json>()) ...[
                  _QuoteCard(quote: q, busy: busyId == q['productVersionId'], onChoose: busyId == null ? () => choose(q) : null),
                  const SizedBox(height: Tokens.s4),
                ],
              ]),
      ),
    );
  }
}

class _QuoteCard extends ConsumerWidget {
  const _QuoteCard({required this.quote, required this.busy, required this.onChoose});
  final Json quote;
  final bool busy;
  final VoidCallback? onChoose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = ref.watch(sessionProvider).locale;
    final drought = quote['peril'] == 'DROUGHT';
    final colour = drought ? Tokens.drought : Tokens.flood;
    final examples = (quote['examplePayouts'] as List).cast<Json>();

    return SectionCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(drought ? Icons.wb_sunny_outlined : Icons.water_drop_outlined, color: colour, size: 28),
          const SizedBox(width: Tokens.s3),
          Expanded(child: Text(localName(quote['names'], lang), style: theme.textTheme.titleLarge)),
        ]),
        const SizedBox(height: Tokens.s4),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t.youPay, style: theme.textTheme.labelMedium),
              Text(rupees(quote['netPaise'] as num), style: theme.textTheme.headlineMedium),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(t.coverAmount, style: theme.textTheme.labelMedium),
            Text(rupees(quote['sumInsuredPaise'] as num), style: theme.textTheme.titleLarge),
          ]),
        ]),
        if ((quote['subsidyPaise'] as num) > 0)
          Text(t.sponsorPays(rupees(quote['subsidyPaise'] as num)), style: theme.textTheme.bodyMedium),
        const Padding(padding: EdgeInsets.symmetric(vertical: Tokens.s4), child: Divider()),
        Text(t.whenPaid, style: theme.textTheme.titleMedium),
        const SizedBox(height: Tokens.s2),
        for (final e in examples)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: Tokens.s1),
            child: Row(children: [
              Container(width: 2, height: 20, color: theme.colorScheme.onSurface.withValues(alpha: 0.7)), // gauge tick
              const SizedBox(width: Tokens.s3),
              Expanded(
                child: Text(
                  drought
                      ? t.droughtRule(num1(e['threshold'] as num))
                      : t.floodRule(RegExp(r'\d+').stringMatch(e['unit'] as String) ?? '', num1(e['threshold'] as num)),
                  style: theme.textTheme.bodyLarge,
                ),
              ),
              Text(rupees(e['amountPaise'] as num), style: theme.textTheme.titleMedium?.copyWith(color: colour)),
            ]),
          ),
        const SizedBox(height: Tokens.s4),
        AppButton(label: t.choose, busy: busy, onPressed: onChoose),
      ]),
    );
  }
}
