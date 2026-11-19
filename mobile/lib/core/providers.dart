import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api.dart';

typedef Json = Map<String, dynamic>;

/// App session: whether a refresh token exists (auto-login).
/// A ChangeNotifier so go_router can re-run redirects when it changes.
class Session extends ChangeNotifier {
  bool loggedIn = false;
  late final Api api = Api(onLoggedOut: () => logout());

  Future<void> load() async {
    loggedIn = await api.hasSession;
  }

  /// English only for now (product decision 2026-11-19); l10n plumbing stays so languages can return.
  String get locale => 'en';

  Future<void> login(Json tokens) async {
    await api.saveTokens(tokens);
    loggedIn = true;
    notifyListeners();
  }

  Future<void> logout() async {
    if (!loggedIn) return;
    await api.clearTokens();
    loggedIn = false;
    notifyListeners();
  }
}

final sessionProvider = Provider<Session>((ref) => throw UnimplementedError('overridden in main'));
final apiProvider = Provider<Api>((ref) => ref.watch(sessionProvider).api);

/// (data, fromCache) - fromCache drives the offline banner.
final meProvider = FutureProvider<(Json, bool)>((ref) => ref.watch(apiProvider).getCached<Json>('/me'));
final policiesProvider = FutureProvider<(List<dynamic>, bool)>((ref) => ref.watch(apiProvider).getCached<List<dynamic>>('/policies'));
final policyProvider = FutureProvider.family<(Json, bool), String>((ref, id) => ref.watch(apiProvider).getCached<Json>('/policies/$id'));
final cropsProvider = FutureProvider<(List<dynamic>, bool)>((ref) => ref.watch(apiProvider).getCached<List<dynamic>>('/catalog/crops'));
final seasonsProvider = FutureProvider<(List<dynamic>, bool)>((ref) => ref.watch(apiProvider).getCached<List<dynamic>>('/catalog/seasons'));
final plotsProvider = FutureProvider<(List<dynamic>, bool)>((ref) => ref.watch(apiProvider).getCached<List<dynamic>>('/me/plots'));

final onlineProvider = StreamProvider<bool>((ref) async* {
  bool online(List<ConnectivityResult> r) => !r.contains(ConnectivityResult.none) || r.isEmpty;
  yield online(await Connectivity().checkConnectivity());
  yield* Connectivity().onConnectivityChanged.map(online);
});

/// First unfinished onboarding step, in order (J-1).
String nextStep(Json me) {
  final o = me['onboarding'] as Json;
  if (o['consent'] != true || o['profile'] != true) return '/onboarding/profile';
  if (o['plot'] != true) return '/onboarding/plot';
  if (o['wallet'] != true) return '/onboarding/wallet';
  return '/home';
}

/// Localised name from the API's {en, hi, mr} maps.
String localName(Object? names, String lang) {
  if (names is Map) return (names[lang] ?? names['en'] ?? '').toString();
  return '';
}
