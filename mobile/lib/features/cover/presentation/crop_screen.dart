import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-09: crop picked from an icon grid, season pre-selected (FR-07).
class CropScreen extends ConsumerStatefulWidget {
  const CropScreen({super.key});
  @override
  ConsumerState<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends ConsumerState<CropScreen> {
  static const icons = {
    'grass': Icons.grass,
    'cloud': Icons.cloud_outlined,
    'spa': Icons.spa_outlined,
    'agriculture': Icons.agriculture_outlined,
    'eco': Icons.eco_outlined,
    'local_florist': Icons.local_florist_outlined,
  };
  String? crop;
  String? season;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final lang = ref.watch(sessionProvider).locale;
    final crops = ref.watch(cropsProvider);
    final seasons = ref.watch(seasonsProvider);
    final plots = ref.watch(plotsProvider);
    final seasonList = seasons.value?.$1 ?? const [];
    season ??= seasonList.isEmpty ? null : (seasonList.first as Json)['code'] as String;
    final plotId = (plots.value?.$1.firstOrNull as Json?)?['id'] as String?;

    return StepScaffold(
      title: t.cropTitle,
      body: crops.when(
        loading: () => const LoadingView(),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(cropsProvider)),
        data: (data) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: Tokens.s3,
            crossAxisSpacing: Tokens.s3,
            childAspectRatio: 1.25,
            children: [
              for (final c in data.$1.cast<Json>())
                _CropTile(
                  label: localName(c['namesI18n'], lang),
                  icon: icons[c['icon']] ?? Icons.grass,
                  selected: crop == c['code'],
                  onTap: () => setState(() => crop = c['code'] as String),
                ),
            ],
          ),
          const SizedBox(height: Tokens.s6),
          Text(t.seasonLabel, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: Tokens.s2),
          Wrap(spacing: Tokens.s2, children: [
            for (final s in seasonList.cast<Json>())
              ChoiceChip(
                label: Text(localName(s['namesI18n'], lang)),
                selected: season == s['code'],
                onSelected: (_) => setState(() => season = s['code'] as String),
              ),
          ]),
        ]),
      ),
      bottom: AppButton(
        label: t.continueLabel,
        icon: Icons.arrow_forward,
        onPressed: crop != null && season != null && plotId != null
            ? () => context.push('/cover/quote', extra: {'plotId': plotId, 'cropCode': crop, 'seasonCode': season})
            : null,
      ),
    );
  }
}

class _CropTile extends StatelessWidget {
  const _CropTile({required this.label, required this.icon, required this.selected, required this.onTap});
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? scheme.primary.withValues(alpha: 0.08) : scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Tokens.radiusCard),
          side: BorderSide(color: selected ? scheme.primary : scheme.outline, width: selected ? 2 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Tokens.radiusCard),
          onTap: onTap,
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 36, color: selected ? scheme.primary : scheme.onSurfaceVariant),
            const SizedBox(height: Tokens.s2),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Tokens.s2),
              child: Text(label, textAlign: TextAlign.center, maxLines: 2, style: Theme.of(context).textTheme.titleMedium),
            ),
          ]),
        ),
      ),
    );
  }
}
