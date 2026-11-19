/// Build-time config via --dart-define (no secrets ever live in the APK).
///
/// Emulator (default):   flutter run
/// Physical phone (LAN): flutter run --dart-define=API_BASE_URL=http://192.168.1.20:4000
/// Production:           flutter build appbundle --dart-define=APP_ENV=prod --dart-define=API_BASE_URL=https://api.fasalshield.in
class AppConfig {
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000');
  static const appEnv = String.fromEnvironment('APP_ENV', defaultValue: 'local');
  static bool get isProd => appEnv == 'prod';
}
