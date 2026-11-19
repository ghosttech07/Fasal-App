import 'package:cupertino_ui/cupertino_ui.dart' show GlobalCupertinoLocalizations;
import 'package:flutter_localizations/flutter_localizations.dart' show GlobalWidgetsLocalizations;
import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';

/// Use this instead of the generated AppLocalizations.localizationsDelegates: since Flutter 3.47 the
/// Material/Cupertino strings for hi/mr come from material_ui/cupertino_ui, not flutter_localizations.
const List<LocalizationsDelegate<Object>> appLocalizationDelegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
];
