import 'dart:convert';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

/// Tokens live in the Android Keystore-backed secure storage; everything else in Hive.
class Storage {
  static const _secure = FlutterSecureStorage();
  static late Box<String> _box;

  static Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox<String>('fasalshield');
  }

  // shortcut: the web preview keeps tokens in Hive (browser storage) because secure storage needs
  // WebCrypto, which plain-http LAN pages lack; web is a demo target only, Android keeps the Keystore.
  static Future<String?> readSecret(String key) async => kIsWeb ? _box.get('secret:$key') : _secure.read(key: key);
  static Future<void> writeSecret(String key, String value) =>
      kIsWeb ? _box.put('secret:$key', value) : _secure.write(key: key, value: value);
  static Future<void> deleteSecret(String key) => kIsWeb ? _box.delete('secret:$key') : _secure.delete(key: key);

  static String? get(String key) => _box.get(key);
  static Future<void> put(String key, String value) => _box.put(key, value);

  /// Offline read cache for GET responses (NFR-04).
  static dynamic cached(String key) {
    final raw = _box.get('cache:$key');
    return raw == null ? null : jsonDecode(raw);
  }

  static Future<void> cache(String key, Object? json) => _box.put('cache:$key', jsonEncode(json));

  static Future<void> clearCache() async {
    final keys = _box.keys.where((k) => k.toString().startsWith('cache:')).toList();
    await _box.deleteAll(keys);
  }
}
