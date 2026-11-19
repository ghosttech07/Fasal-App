import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/providers.dart';
import '../../../core/theme.dart';
import '../../../core/widgets.dart';
import '../../../l10n/app_localizations.dart';

/// F-04 + F-05: consent (DPDP, FR-03) and basic profile/KYC (FR-04) on one short screen.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  static const districts = ['LATUR', 'BEED', 'DHARASHIV', 'NANDED'];
  static const idTypes = ['VOTER_ID', 'RATION_CARD', 'PAN', 'AADHAAR'];

  final name = TextEditingController();
  final village = TextEditingController();
  final idNumber = TextEditingController();
  String? district;
  String idType = 'VOTER_ID';
  bool consent = false;
  bool busy = false;

  bool get ready => consent && name.text.trim().length >= 2 && village.text.trim().length >= 2 && district != null;

  Future<void> save() async {
    setState(() => busy = true);
    final api = ref.read(apiProvider);
    final lang = ref.read(sessionProvider).locale;
    try {
      final me = (await ref.read(meProvider.future)).$1;
      if ((me['consents'] as List).contains('INSURANCE_SERVICING') == false) {
        await api.post<Json>('/me/consents', {'purposes': ['INSURANCE_SERVICING'], 'language': lang});
      }
      await api.patch<Json>('/me', {
        'name': name.text.trim(),
        'village': village.text.trim(),
        'districtCode': district,
        'language': lang,
        if (idNumber.text.trim().isNotEmpty) 'idDoc': {'type': idType, 'number': idNumber.text.trim()},
      });
      ref.invalidate(meProvider);
      if (mounted) context.go('/onboarding/plot');
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    name.dispose();
    village.dispose();
    idNumber.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final theme = Theme.of(context);
    const gap = SizedBox(height: Tokens.s4);
    return StepScaffold(
      step: 1,
      title: t.profileTitle,
      body: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SectionCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.shield_outlined, color: theme.colorScheme.primary),
              const SizedBox(width: Tokens.s2),
              Expanded(child: Text(t.consentTitle, style: theme.textTheme.titleMedium)),
            ]),
            const SizedBox(height: Tokens.s2),
            Text(t.consentBody, style: theme.textTheme.bodyMedium),
            const SizedBox(height: Tokens.s2),
            CheckboxListTile(
              value: consent,
              onChanged: (v) => setState(() => consent = v ?? false),
              title: Text(t.consentAgree, style: theme.textTheme.titleMedium),
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
            ),
          ]),
        ),
        const SizedBox(height: Tokens.s6),
        TextField(
          controller: name,
          textCapitalization: TextCapitalization.words,
          autofillHints: const [AutofillHints.name],
          decoration: InputDecoration(labelText: t.fullName, prefixIcon: const Icon(Icons.person_outline)),
          onChanged: (_) => setState(() {}),
        ),
        gap,
        DropdownButtonFormField<String>(
          initialValue: district,
          decoration: InputDecoration(labelText: t.district, prefixIcon: const Icon(Icons.map_outlined)),
          items: [for (final d in districts) DropdownMenuItem(value: d, child: Text(t.districtName(d)))],
          onChanged: (v) => setState(() => district = v),
        ),
        gap,
        TextField(
          controller: village,
          textCapitalization: TextCapitalization.words,
          decoration: InputDecoration(labelText: t.village, prefixIcon: const Icon(Icons.home_outlined)),
          onChanged: (_) => setState(() {}),
        ),
        const SizedBox(height: Tokens.s6),
        Text(t.idOptional, style: theme.textTheme.bodyMedium),
        const SizedBox(height: Tokens.s3),
        DropdownButtonFormField<String>(
          initialValue: idType,
          decoration: InputDecoration(labelText: t.idType, prefixIcon: const Icon(Icons.badge_outlined)),
          items: [for (final d in idTypes) DropdownMenuItem(value: d, child: Text(t.idTypeName(d)))],
          onChanged: (v) => setState(() => idType = v ?? idType),
        ),
        gap,
        TextField(
          controller: idNumber,
          textCapitalization: TextCapitalization.characters,
          decoration: InputDecoration(labelText: t.idNumber),
        ),
      ]),
      bottom: AppButton(label: t.save, busy: busy, onPressed: ready ? save : null),
    );
  }
}
