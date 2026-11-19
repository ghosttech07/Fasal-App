import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'core/locale.dart';
import 'core/providers.dart';
import 'core/router.dart';
import 'core/storage.dart';
import 'core/theme.dart';
import 'l10n/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Storage.init();
  final session = Session();
  await session.load(); // auto-login if a refresh token is stored
  runApp(
    ProviderScope(
      retry: (_, _) =>
          null, // errors surface immediately with a "Try again" button
      overrides: [sessionProvider.overrideWithValue(session)],
      child: FasalShieldApp(session: session),
    ),
  );
}

class FasalShieldApp extends ConsumerStatefulWidget {
  const FasalShieldApp({super.key, required this.session});
  final Session session;
  @override
  ConsumerState<FasalShieldApp> createState() => _FasalShieldAppState();
}

class _FasalShieldAppState extends ConsumerState<FasalShieldApp> {
  late final GoRouter router = buildRouter(widget.session);

  @override
  void initState() {
    super.initState();
    // Logging out clears every cached provider so the next farmer never sees old data.
    widget.session.addListener(() {
      if (!widget.session.loggedIn) {
        for (final p in [meProvider, policiesProvider, plotsProvider]) {
          ref.invalidate(p);
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.session,
    builder: (context, _) => MaterialApp.router(
      title: 'FasalShield',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      locale: Locale(widget.session.locale),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: appLocalizationDelegates,
      routerConfig: router,
    ),
  );
}
