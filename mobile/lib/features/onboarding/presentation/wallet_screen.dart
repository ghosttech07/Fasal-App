import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-06: link UPI VPA; the gateway (mock) returns the bank-registered name to confirm (FR-05).
class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});
  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  final vpa = TextEditingController();
  bool busy = false;
  Json? linked;

  bool get valid =>
      RegExp(r'^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$')
          .hasMatch(vpa.text.trim());

  Future<void> verify() async {
    setState(() => busy = true);
    try {
      final me = await ref.read(apiProvider).post<Json>('/me/wallets', {
        'vpa': vpa.text.trim(),
      });
      setState(() => linked = me['wallet'] as Json);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    vpa.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    return StepScaffold(
      step: 3,
      title: t.walletTitle,
      subtitle: t.walletHelp,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: vpa,
            enabled: linked == null,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: InputDecoration(
              labelText: t.upiId,
              hintText: t.upiHint,
              prefixIcon: const Icon(Icons.account_balance_wallet_outlined),
            ),
            onChanged: (_) => setState(() {}),
          ),
          if (linked != null) ...[
            const SizedBox(height: Tokens.s4),
            SectionCard(
              child: Row(
                children: [
                  const Icon(
                    Icons.verified_outlined,
                    color: Tokens.accent,
                    size: 28,
                  ),
                  const SizedBox(width: Tokens.s3),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          t.upiVerifiedAs(
                            linked!['verifiedName'] as String? ?? '',
                          ),
                          style: theme.textTheme.titleMedium,
                        ),
                        Text(
                          linked!['handleMasked'] as String,
                          style: theme.textTheme.bodyMedium,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
      bottom: linked == null
          ? AppButton(
              label: t.verifyUpi,
              busy: busy,
              onPressed: valid ? verify : null,
            )
          : AppButton(
              label: t.thisIsMine,
              icon: Icons.check,
              onPressed: () {
                ref.invalidate(meProvider);
                context.go('/home');
              },
            ),
    );
  }
}
