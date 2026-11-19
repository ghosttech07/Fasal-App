import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-02: phone number -> OTP request (FR-01).
class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});
  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final controller = TextEditingController();
  bool busy = false;
  bool invalid = false;

  bool get valid => RegExp(r'^[6-9]\d{9}$').hasMatch(controller.text);

  Future<void> submit() async {
    if (!valid) return setState(() => invalid = true);
    setState(() => busy = true);
    try {
      final res = await ref.read(apiProvider).post<Json>('/auth/otp/request', {
        'phone': controller.text,
      });
      if (mounted) {
        context.push('/otp', extra: {...res, 'phone': controller.text});
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return StepScaffold(
      title: t.phoneTitle,
      subtitle: t.phoneHelp,
      body: TextField(
        controller: controller,
        autofocus: true,
        keyboardType: TextInputType.phone,
        autofillHints: const [AutofillHints.telephoneNumberNational],
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(10),
        ],
        style: Theme.of(context).textTheme.titleLarge
            ?.copyWith(letterSpacing: 1.5),
        onChanged: (_) => setState(() => invalid = false),
        onSubmitted: (_) => submit(),
        decoration: InputDecoration(
          labelText: t.phoneHint,
          prefixIcon: const Padding(
            padding: EdgeInsets.only(left: Tokens.s4, right: Tokens.s2),
            child: Text('+91', style: TextStyle(fontSize: 22)),
          ),
          prefixIconConstraints: const BoxConstraints(
            minWidth: 0,
            minHeight: 0,
          ),
          errorText: invalid ? t.errorPhone : null,
        ),
      ),
      bottom: AppButton(
        label: t.sendCode,
        icon: Icons.sms_outlined,
        busy: busy,
        onPressed: valid ? submit : null,
      ),
    );
  }
}
