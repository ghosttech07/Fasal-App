import 'dart:async';

import 'package:dio/dio.dart';

import 'config.dart';
import 'storage.dart';

/// Stable error code from the API's problem+json (`code`), or `network` when the server is unreachable.
class ApiError implements Exception {
  ApiError(this.code, [this.status]);
  final String code;
  final int? status;
  bool get isNetwork => code == 'network';
  @override
  String toString() => 'ApiError($code, $status)';
}

/// dio client: bearer auth, single-flight token refresh, retry with backoff for idempotent GETs,
/// and an offline read cache so the farmer always sees their last-known policies.
class Api {
  Api({required this.onLoggedOut}) {
    _dio.interceptors.add(InterceptorsWrapper(onRequest: _attachToken, onError: _onError));
  }

  final void Function() onLoggedOut;
  final _dio = Dio(BaseOptions(
    baseUrl: '${AppConfig.apiBaseUrl}/api/v1',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 20),
    contentType: 'application/json',
  ));
  Future<bool>? _refreshing;

  static const _accessKey = 'accessToken';
  static const _refreshKey = 'refreshToken';

  Future<bool> get hasSession async => (await Storage.readSecret(_refreshKey)) != null;

  Future<void> saveTokens(Map<String, dynamic> json) async {
    await Storage.writeSecret(_accessKey, json['accessToken'] as String);
    await Storage.writeSecret(_refreshKey, json['refreshToken'] as String);
  }

  Future<void> clearTokens() async {
    final refresh = await Storage.readSecret(_refreshKey);
    if (refresh != null) {
      unawaited(_dio.post('/auth/logout', data: {'refreshToken': refresh}).then((_) {}, onError: (_) {}));
    }
    await Storage.deleteSecret(_accessKey);
    await Storage.deleteSecret(_refreshKey);
    await Storage.clearCache();
  }

  Future<void> _attachToken(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await Storage.readSecret(_accessKey);
    if (token != null && !options.path.startsWith('/auth/')) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  Future<void> _onError(DioException error, ErrorInterceptorHandler handler) async {
    final opts = error.requestOptions;
    final retried = opts.extra['retried'] == true;

    // 1) Expired access token → refresh once (shared by concurrent requests) and replay.
    if (error.response?.statusCode == 401 && !opts.path.startsWith('/auth/') && !retried) {
      final ok = await (_refreshing ??= _refresh().whenComplete(() => _refreshing = null));
      if (ok) {
        opts.extra['retried'] = true;
        opts.headers['Authorization'] = 'Bearer ${await Storage.readSecret(_accessKey)}';
        try {
          return handler.resolve(await _dio.fetch(opts));
        } on DioException catch (e) {
          return handler.next(e);
        }
      }
      onLoggedOut();
    }

    // 2) Flaky 2G/3G: retry GETs on connection problems with backoff (1s, 3s).
    final attempt = (opts.extra['attempt'] as int?) ?? 0;
    final transient = error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout;
    if (opts.method == 'GET' && transient && attempt < 2) {
      await Future<void>.delayed(Duration(seconds: attempt == 0 ? 1 : 3));
      opts.extra['attempt'] = attempt + 1;
      try {
        return handler.resolve(await _dio.fetch(opts));
      } on DioException catch (e) {
        return handler.next(e);
      }
    }
    handler.next(error);
  }

  Future<bool> _refresh() async {
    final refresh = await Storage.readSecret(_refreshKey);
    if (refresh == null) return false;
    try {
      final res = await _dio.post<Map<String, dynamic>>('/auth/refresh', data: {'refreshToken': refresh});
      await saveTokens(res.data!);
      return true;
    } on DioException {
      await Storage.deleteSecret(_accessKey);
      await Storage.deleteSecret(_refreshKey);
      return false;
    }
  }

  Future<T> _call<T>(Future<Response<dynamic>> Function() request) async {
    try {
      final res = await request();
      return res.data as T;
    } on DioException catch (e) {
      final data = e.response?.data;
      if (data is Map && data['code'] is String) throw ApiError(data['code'] as String, e.response?.statusCode);
      if (e.response == null) throw ApiError('network');
      throw ApiError('http_${e.response!.statusCode}', e.response!.statusCode);
    }
  }

  Future<T> get<T>(String path) => _call<T>(() => _dio.get(path));
  Future<T> post<T>(String path, [Object? body]) => _call<T>(() => _dio.post(path, data: body));
  Future<T> patch<T>(String path, Object body) => _call<T>(() => _dio.patch(path, data: body));

  /// GET with offline fallback: returns (data, fromCache). Throws only if there is no cached copy.
  Future<(T, bool)> getCached<T>(String path) async {
    try {
      final data = await get<T>(path);
      await Storage.cache(path, data);
      return (data, false);
    } on ApiError catch (e) {
      final cached = Storage.cached(path);
      if (e.isNetwork && cached != null) return (cached as T, true);
      rethrow;
    }
  }
}
