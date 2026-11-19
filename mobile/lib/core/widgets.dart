import 'package:material_ui/material_ui.dart';

import '../l10n/app_localizations.dart';
import 'api.dart';
import 'format.dart';
import 'theme.dart';

/// Maps API error codes to plain-language messages (Frontend spec §3: forgiving, specific).
String errorText(BuildContext context, Object error) {
  final t = AppLocalizations.of(context);
  final code = error is ApiError ? error.code : 'generic';
  return switch (code) {
    'network' => t.errorNetwork,
    'otp_invalid' => t.errorOtpInvalid,
    'otp_expired' || 'otp_attempts_exceeded' => t.errorOtpExpired,
    'otp_rate_limited' || 'http_429' => t.errorRateLimited,
    'vpa_invalid' => t.errorVpaInvalid,
    'gps_accuracy_too_low' => t.errorGps,
    'already_insured' => t.errorAlreadyInsured,
    _ => t.errorGeneric,
  };
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(
          errorText(context, error),
          style: const TextStyle(fontSize: 16),
        ),
      ),
    );
}

/// Full-width primary action with an inline progress state (no double taps while busy).
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
    this.icon,
    this.outlined = false,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData? icon;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final child = busy
        ? const SizedBox.square(
            dimension: 24,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 24),
                const SizedBox(width: Tokens.s2),
              ],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );
    final action = busy ? null : onPressed;
    return outlined
        ? OutlinedButton(onPressed: action, child: child)
        : FilledButton(onPressed: action, child: child);
  }
}

/// Screen scaffold for one-task-per-screen flows: title, optional step dots, body, bottom action.
class StepScaffold extends StatelessWidget {
  const StepScaffold({
    super.key,
    required this.title,
    required this.body,
    this.step,
    this.total = 3,
    this.bottom,
    this.subtitle,
  });
  final String title;
  final String? subtitle;
  final Widget body;
  final int? step;
  final int total;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: step == null ? null : StepDots(step: step!, total: total),
        centerTitle: false,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            Tokens.s6,
            Tokens.s2,
            Tokens.s6,
            Tokens.s6,
          ),
          children: [
            Text(title, style: theme.textTheme.headlineMedium),
            if (subtitle != null) ...[
              const SizedBox(height: Tokens.s2),
              Text(subtitle!, style: theme.textTheme.bodyMedium),
            ],
            const SizedBox(height: Tokens.s6),
            body,
          ],
        ),
      ),
      // Lift the primary action above the keyboard so it is never hidden while typing.
      bottomNavigationBar: bottom == null
          ? null
          : Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(Tokens.s6, Tokens.s2, Tokens.s6, Tokens.s4),
                  child: bottom,
                ),
              ),
            ),
    );
  }
}

/// Wizard progress, e.g. "2 of 3" with dots (docs §3.2).
class StepDots extends StatelessWidget {
  const StepDots({super.key, required this.step, required this.total});
  final int step;
  final int total;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      label: '$step / $total',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= total; i++)
            Container(
              width: i == step ? 24 : 8,
              height: 8,
              margin: const EdgeInsets.only(right: Tokens.s1),
              decoration: BoxDecoration(
                color: i <= step ? scheme.primary : scheme.outline,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
        ],
      ),
    );
  }
}

class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(Tokens.s5),
  });
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(padding: padding, child: child),
    ),
  );
}

/// Status language: colour + icon + word, never colour alone (docs §3.5).
class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
  });
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(
      horizontal: Tokens.s2,
      vertical: Tokens.s1,
    ),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: Tokens.s1),
        // Flexible: hi/mr labels run longer than English and must wrap, not overflow.
        Flexible(
          child: Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    ),
  );
}

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        color: scheme.surfaceContainerHighest,
        padding: const EdgeInsets.symmetric(
          horizontal: Tokens.s6,
          vertical: Tokens.s3,
        ),
        child: Row(
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 20,
              color: scheme.onSurfaceVariant,
            ),
            const SizedBox(width: Tokens.s2),
            Expanded(
              child: Text(
                AppLocalizations.of(context).offline,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.action,
  });
  final IconData icon;
  final String title;
  final String body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Tokens.s8),
      child: Column(
        children: [
          Icon(icon, size: 56, color: theme.colorScheme.primary),
          const SizedBox(height: Tokens.s4),
          Text(
            title,
            style: theme.textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: Tokens.s2),
          Text(
            body,
            style: theme.textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
          if (action != null) ...[const SizedBox(height: Tokens.s6), action!],
        ],
      ),
    );
  }
}

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});
  @override
  Widget build(BuildContext context) => const Center(
    child: Padding(
      padding: EdgeInsets.all(Tokens.s8),
      child: CircularProgressIndicator(),
    ),
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.error, required this.onRetry});
  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => EmptyState(
    icon: error is ApiError && (error as ApiError).isNetwork
        ? Icons.cloud_off_outlined
        : Icons.error_outline,
    title: errorText(context, error),
    body: '',
    action: AppButton(
      label: AppLocalizations.of(context).retry,
      onPressed: onRetry,
      outlined: true,
    ),
  );
}

/// The product's one rich moment (unslop): a rain gauge. Drought shows rain so far against normal,
/// flood shows the heaviest N-day rain; payout thresholds are gauge ticks (the signature detail).
class RainMeter extends StatelessWidget {
  const RainMeter({
    super.key,
    required this.phase,
    required this.indexType,
    required this.slabs,
    this.rollingDays = 3,
    this.compact = false,
  });
  final Map<String, dynamic> phase;
  final String indexType;
  final List<dynamic> slabs;
  final int rollingDays;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final drought = indexType == 'DROUGHT_RAIN_DEFICIT';
    final colour = drought ? Tokens.drought : Tokens.flood;
    final observed = (phase['observedMm'] as num).toDouble();
    final normal = (phase['normalMm'] as num).toDouble();
    final index = (phase['indexValue'] as num?)?.toDouble() ?? 0;
    final thresholds = slabs
        .map((s) => ((s as Map)['threshold'] as num).toDouble())
        .toList();

    // Bar position 0..1 and tick positions on the same scale.
    final double fill;
    final List<double> ticks;
    if (drought) {
      fill = normal <= 0 ? 0 : (observed / normal).clamp(0, 1);
      ticks = thresholds
          .map((th) => (100 - th) / 100)
          .toList(); // "40% below normal" = 60% of normal
    } else {
      final top = (thresholds.isEmpty ? 100 : thresholds.last) * 1.15;
      fill = (index / top).clamp(0, 1);
      ticks = thresholds.map((th) => th / top).toList();
    }
    final triggered = (phase['triggeredLevel'] as num? ?? 0) > 0;
    final pending = phase['indexValue'] == null;
    final headline = pending
        ? t.rainDataPending
        : drought
        ? t.belowNormal(num1(index))
        : t.heaviestRain(rollingDays, num1(index));
    final detail = pending
        ? t.rainDataPendingHelp
        : drought
        ? '${t.rainSoFar(num1(observed))}  ·  ${t.normalRain(num1(normal))}'
        : t.rainSoFar(num1(observed));

    return Semantics(
      label: '$headline. $detail',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                drought ? Icons.wb_sunny_outlined : Icons.water_drop_outlined,
                size: 20,
                color: colour,
              ),
              const SizedBox(width: Tokens.s2),
              Expanded(
                child: Text(
                  headline,
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: triggered ? colour : null,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Tokens.s3),
          LayoutBuilder(
            builder: (context, box) {
              final w = box.maxWidth;
              return SizedBox(
                height: compact ? 28 : 36,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      right: 0,
                      top: 6,
                      height: 16,
                      child: Container(
                        decoration: BoxDecoration(
                          color: colour.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 0,
                      top: 6,
                      height: 16,
                      width: w * fill,
                      child: Container(
                        decoration: BoxDecoration(
                          color: colour,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                    for (final tick in ticks)
                      Positioned(
                        left: (w * tick - 1).clamp(0, w - 2),
                        top: 0,
                        width: 2,
                        height: 28,
                        child: Container(
                          color: theme.colorScheme.onSurface.withValues(
                            alpha: 0.7,
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
          if (!compact) ...[
            const SizedBox(height: Tokens.s2),
            Text(
              detail,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
