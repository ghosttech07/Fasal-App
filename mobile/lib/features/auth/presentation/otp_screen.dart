import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config.dart';
import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-03: OTP verify → tokens in secure storage → auto-login next launch (FR-01).
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.args});
  final Json args;
  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final controller = TextEditingController();
  late String requestId = widget.args['requestId'] as String;
  late String? devOtp = widget.args['devOtp'] as String?;
  bool busy = false;
  int wait = 30;
  Timer? timer;

  @override
  void initState() {
    super.initState();
    startTimer();
  }

  void startTimer() {
    timer?.cancel();
    wait = 30;
    timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || wait == 0) return t.cancel();
      setState(() => wait--);
    });
  }

  Future<void> verify() async {
    if (controller.text.length != 6) return;
    setState(() => busy = true);
    try {
      final api = ref.read(apiProvider);
      final tokens = await api.post<Json>('/auth/otp/verify', {'requestId': requestId, 'otp': controller.text, 'deviceId': 'android'});
      await ref.read(sessionProvider).login(tokens); // router redirect takes over (→ /start)
    } catch (e) {
      controller.clear();
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> resend() async {
    try {
      final res = await ref.read(apiProvider).post<Json>('/auth/otp/request', {'phone': widget.args['phone']});
      setState(() {
        requestId = res['requestId'] as String;
        devOtp = res['devOtp'] as String?;
      });
      startTimer();
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final phone = widget.args['phone'] as String;
    return StepScaffold(
      title: t.otpTitle,
      subtitle: t.otpSentTo('+91 ${phone.substring(0, 5)} ${phone.substring(5)}'),
      body: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          autofillHints: const [AutofillHints.oneTimeCode],
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
          textAlign: TextAlign.center,
          style: theme.textTheme.headlineMedium?.copyWith(letterSpacing: 12, fontFeatures: const [FontFeature.tabularFigures()]),
          decoration: const InputDecoration(hintText: '······'),
          onChanged: (v) {
            setState(() {});
            if (v.length == 6) verify();
          },
        ),
        if (devOtp != null && !AppConfig.isProd) ...[
          const SizedBox(height: Tokens.s3),
          Text(t.devCode(devOtp!), style: theme.textTheme.bodyMedium),
        ],
        const SizedBox(height: Tokens.s4),
        Row(children: [
          wait > 0
              ? Text(t.resendIn(wait), style: theme.textTheme.bodyMedium)
              : TextButton(onPressed: resend, child: Text(t.resend)),
          const Spacer(),
          TextButton(onPressed: () => context.pop(), child: Text(t.changeNumber)),
        ]),
      ]),
      bottom: AppButton(label: t.verify, busy: busy, onPressed: controller.text.length == 6 ? verify : null),
    );
  }
}
