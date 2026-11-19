import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-11 + F-12: premium summary → sandbox UPI payment → policy issued (FR-14, FR-15).
class PayScreen extends ConsumerStatefulWidget {
  const PayScreen({super.key, required this.args});
  final Json args;
  @override
  ConsumerState<PayScreen> createState() => _PayScreenState();
}

class _PayScreenState extends ConsumerState<PayScreen> {
  bool busy = false;
  Json? issued;

  Json get policy => widget.args['policy'] as Json;

  Future<void> pay() async {
    setState(() => busy = true);
    try {
      final result = await ref.read(apiProvider).post<Json>('/policies/${policy['id']}/pay');
      ref.invalidate(policiesProvider);
      setState(() => issued = result);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final premium = policy['premiumPaise'] as num;
    final subsidy = policy['subsidyPaise'] as num;
    final net = premium - subsidy;

    if (issued != null) {
      return StepScaffold(
        title: t.paySuccessTitle,
        body: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Icon(Icons.verified_user_outlined, size: 72, color: Tokens.accent),
          const SizedBox(height: Tokens.s4),
          Text(t.policyNumber(issued!['policyNumber'] as String), style: theme.textTheme.titleLarge, textAlign: TextAlign.center),
          const SizedBox(height: Tokens.s2),
          Text('${t.coverAmount} ${rupees(policy['sumInsuredPaise'] as num)}', style: theme.textTheme.bodyLarge, textAlign: TextAlign.center),
        ]),
        bottom: AppButton(label: t.goHome, icon: Icons.home_outlined, onPressed: () => context.go('/home')),
      );
    }

    Widget line(String label, String value, {bool strong = false}) => Padding(
          padding: const EdgeInsets.symmetric(vertical: Tokens.s2),
          child: Row(children: [
            Expanded(child: Text(label, style: strong ? theme.textTheme.titleMedium : theme.textTheme.bodyLarge)),
            Text(value, style: (strong ? theme.textTheme.headlineMedium : theme.textTheme.bodyLarge)
                ?.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
          ]),
        );

    return StepScaffold(
      title: t.payTitle,
      body: SectionCard(
        child: Column(children: [
          line(t.premium, rupees(premium)),
          if (subsidy > 0) line(t.subsidy, '- ${rupees(subsidy)}'),
          const Divider(),
          line(t.total, rupees(net), strong: true),
        ]),
      ),
      bottom: AppButton(label: t.payWithUpi(rupees(net)), icon: Icons.account_balance_outlined, busy: busy, onPressed: pay),
    );
  }
}
