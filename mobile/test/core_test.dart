import 'package:fasalshield/core/format.dart';
import 'package:fasalshield/core/providers.dart';
import 'package:fasalshield/core/theme.dart';
import 'package:fasalshield/core/widgets.dart';
import 'package:fasalshield/l10n/app_localizations.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';

Json onboarding({
  bool consent = true,
  bool profile = true,
  bool plot = true,
  bool wallet = true,
}) => {
  'onboarding': {
    'consent': consent,
    'profile': profile,
    'plot': plot,
    'wallet': wallet,
  },
};

void main() {
  test('rupees uses Indian grouping and no paise', () {
    expect(rupees(150000), '₹1,500');
    expect(rupees(12345600), '₹1,23,456');
  });

  test('num1 shows a decimal only when needed', () {
    expect(num1(5), '5');
    expect(num1(5.43), '5.4');
  });

  test('nextStep resumes onboarding at the first missing step', () {
    expect(nextStep(onboarding(consent: false)), '/onboarding/profile');
    expect(
      nextStep(onboarding(plot: false, wallet: false)),
      '/onboarding/plot',
    );
    expect(nextStep(onboarding(wallet: false)), '/onboarding/wallet');
    expect(nextStep(onboarding()), '/home');
  });

  test('localName falls back to English', () {
    expect(localName({'en': 'Wheat', 'mr': 'गहू'}, 'mr'), 'गहू');
    expect(localName({'en': 'Wheat'}, 'hi'), 'Wheat');
  });

  testWidgets('RainMeter reads out the deficit for screen readers', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('en'),
        theme: buildTheme(Brightness.light),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: const Scaffold(
          body: RainMeter(
            phase: {
              'observedMm': 5.4,
              'normalMm': 15,
              'indexValue': 64,
              'triggeredLevel': 2,
            },
            indexType: 'DROUGHT_RAIN_DEFICIT',
            slabs: [
              {'threshold': 40},
              {'threshold': 60},
              {'threshold': 80},
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('64% below normal'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp('64%')), findsOneWidget);
  });
}
