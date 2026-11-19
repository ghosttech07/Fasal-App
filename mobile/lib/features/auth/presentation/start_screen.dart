import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/widgets.dart';

/// Splash after login/auto-login: loads the profile and resumes onboarding where the farmer left off.
class StartScreen extends ConsumerWidget {
  const StartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(meProvider);
    ref.listen(meProvider, (_, next) {
      final data = next.value;
      if (data != null) context.go(nextStep(data.$1));
    });
    return Scaffold(
      body: SafeArea(
        child: me.hasError
            ? ErrorView(error: me.error!, onRetry: () => ref.invalidate(meProvider))
            : const LoadingView(),
      ),
    );
  }
}
