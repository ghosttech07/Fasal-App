import 'package:material_ui/material_ui.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-08: GPS pin on an OpenStreetMap map (no API key) → plot + 0.05° grid cell (FR-06, FR-19).
/// shortcut: walk-the-boundary polygon capture is P1 in the docs; the API already accepts `boundary`.
class PlotScreen extends ConsumerStatefulWidget {
  const PlotScreen({super.key});
  @override
  ConsumerState<PlotScreen> createState() => _PlotScreenState();
}

class _PlotScreenState extends ConsumerState<PlotScreen> {
  final map = MapController();
  LatLng? pin;
  double? accuracy;
  double acres = 1.5;
  bool locating = false;
  bool busy = false;

  Future<void> locate() async {
    setState(() => locating = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context).locationDenied)));
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 20)),
      );
      setState(() {
        pin = LatLng(pos.latitude, pos.longitude);
        accuracy = pos.accuracy;
      });
      map.move(pin!, 16);
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.of(context).errorGps)));
    } finally {
      if (mounted) setState(() => locating = false);
    }
  }

  Future<void> save() async {
    setState(() => busy = true);
    try {
      await ref.read(apiProvider).post<Json>('/me/plots', {
        'lat': pin!.latitude,
        'lng': pin!.longitude,
        'accuracyM': accuracy ?? 0,
        'areaAcres': acres,
      });
      ref.invalidate(meProvider);
      ref.invalidate(plotsProvider);
      if (!mounted) return;
      final me = (await ref.read(meProvider.future)).$1;
      if (mounted) context.go(nextStep(me));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final good = accuracy != null && accuracy! < 20;
    // shortcut: the web preview accepts a tapped pin because desktop browsers rarely get a <50 m fix;
    // Android still requires real GPS (FR-09). Remove once the web build is no longer used for demos.
    final usable = (accuracy != null && accuracy! < 50) || (kIsWeb && pin != null);
    return StepScaffold(
      step: 2,
      title: t.plotTitle,
      subtitle: t.plotHelp,
      body: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(Tokens.radiusCard),
          child: SizedBox(
            height: 260,
            child: FlutterMap(
              mapController: map,
              options: MapOptions(
                initialCenter: pin ?? const LatLng(18.40, 76.56), // Latur, pilot district
                initialZoom: pin == null ? 9 : 16,
                onTap: (_, point) => setState(() => pin = point),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.fasalshield.fasalshield',
                ),
                if (pin != null)
                  MarkerLayer(markers: [
                    Marker(
                      point: pin!,
                      width: 48,
                      height: 48,
                      alignment: Alignment.topCenter,
                      child: Icon(Icons.location_on, size: 48, color: theme.colorScheme.primary),
                    ),
                  ]),
                const SimpleAttributionWidget(source: Text('OpenStreetMap')),
              ],
            ),
          ),
        ),
        const SizedBox(height: Tokens.s4),
        AppButton(label: t.useMyLocation, icon: Icons.my_location, busy: locating, outlined: pin != null, onPressed: locate),
        if (accuracy != null) ...[
          const SizedBox(height: Tokens.s3),
          StatusChip(
            label: '${t.accuracy(accuracy!.round())}  ·  ${good ? t.accuracyGood : t.accuracyPoor}',
            icon: good ? Icons.gps_fixed : Icons.gps_not_fixed,
            color: good ? Tokens.accent : Tokens.drought,
          ),
        ],
        const SizedBox(height: Tokens.s6),
        Text(t.area, style: theme.textTheme.titleMedium),
        const SizedBox(height: Tokens.s2),
        Row(children: [
          IconButton.outlined(
            tooltip: '-0.5',
            iconSize: 28,
            onPressed: acres > 0.5 ? () => setState(() => acres -= 0.5) : null,
            icon: const Icon(Icons.remove),
          ),
          Expanded(
            child: Text(t.acres(acres.toStringAsFixed(1)), textAlign: TextAlign.center, style: theme.textTheme.titleLarge),
          ),
          IconButton.outlined(
            tooltip: '+0.5',
            iconSize: 28,
            onPressed: acres < 50 ? () => setState(() => acres += 0.5) : null,
            icon: const Icon(Icons.add),
          ),
        ]),
      ]),
      bottom: AppButton(label: t.save, busy: busy, onPressed: pin != null && usable ? save : null),
    );
  }
}
