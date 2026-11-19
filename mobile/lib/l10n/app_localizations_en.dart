// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'FasalShield';

  @override
  String get tagline => 'Crop cover that pays when the rain fails';

  @override
  String get continueLabel => 'Continue';

  @override
  String get phoneTitle => 'Your mobile number';

  @override
  String get phoneHint => '10-digit mobile number';

  @override
  String get phoneHelp => 'We will send a 6-digit code by SMS';

  @override
  String get sendCode => 'Send code';

  @override
  String get otpTitle => 'Enter the code';

  @override
  String otpSentTo(Object phone) {
    return 'Sent to $phone';
  }

  @override
  String get verify => 'Verify';

  @override
  String resendIn(Object seconds) {
    return 'Resend in ${seconds}s';
  }

  @override
  String get resend => 'Resend code';

  @override
  String get changeNumber => 'Change number';

  @override
  String devCode(Object code) {
    return 'Test code: $code';
  }

  @override
  String get profileTitle => 'About you';

  @override
  String get consentTitle => 'Your data, your choice';

  @override
  String get consentBody =>
      'We use your name, phone and field location only to give you cover and send you money. Only your insurer sees it.';

  @override
  String get consentAgree => 'I agree';

  @override
  String get fullName => 'Full name';

  @override
  String get district => 'District';

  @override
  String get village => 'Village';

  @override
  String get idType => 'ID document';

  @override
  String get idNumber => 'ID number';

  @override
  String get idOptional => 'Optional. Helps us pay you faster';

  @override
  String get save => 'Save and continue';

  @override
  String get plotTitle => 'Mark your field';

  @override
  String get plotHelp =>
      'Stand in your field and tap the button. Tap the map to move the pin.';

  @override
  String get useMyLocation => 'Use my location';

  @override
  String accuracy(Object meters) {
    return 'Accuracy $meters m';
  }

  @override
  String get accuracyGood => 'Good signal';

  @override
  String get accuracyPoor => 'Weak signal. Move to open sky';

  @override
  String get area => 'Field size (acres)';

  @override
  String get locationDenied => 'Allow location to mark your field';

  @override
  String get walletTitle => 'Where should we send money';

  @override
  String get walletHelp =>
      'Enter your UPI ID. Payouts go only to this account.';

  @override
  String get upiId => 'UPI ID';

  @override
  String get upiHint => 'name@bank';

  @override
  String get verifyUpi => 'Check UPI ID';

  @override
  String upiVerifiedAs(Object name) {
    return 'Registered name: $name';
  }

  @override
  String get thisIsMine => 'Yes, this is my account';

  @override
  String get homeTitle => 'Your covers';

  @override
  String get buyCover => 'Buy cover';

  @override
  String get emptyTitle => 'No cover yet';

  @override
  String get emptyBody =>
      'Protect your crop from dry spells and heavy rain. Money comes to your UPI automatically.';

  @override
  String get coverAmount => 'Cover';

  @override
  String get paidOut => 'Paid to you';

  @override
  String get statusActive => 'Active';

  @override
  String get statusWaiting => 'Starts soon';

  @override
  String get rainDataPending => 'Waiting for rain data';

  @override
  String get rainDataPendingHelp =>
      'Satellite readings for your field arrive within a day';

  @override
  String payoutOnTheWay(Object amount) {
    return '$amount on the way';
  }

  @override
  String get cropTitle => 'Which crop';

  @override
  String get seasonLabel => 'Season';

  @override
  String get quoteTitle => 'Choose your cover';

  @override
  String get youPay => 'You pay';

  @override
  String sponsorPays(Object amount) {
    return 'Sponsor pays $amount';
  }

  @override
  String get whenPaid => 'When you get paid';

  @override
  String droughtRule(Object pct) {
    return 'Rain $pct% below normal';
  }

  @override
  String floodRule(Object days, Object mm) {
    return '$mm mm rain in $days days';
  }

  @override
  String get choose => 'Choose';

  @override
  String get payTitle => 'Pay premium';

  @override
  String get premium => 'Premium';

  @override
  String get subsidy => 'Sponsor share';

  @override
  String get total => 'You pay';

  @override
  String payWithUpi(Object amount) {
    return 'Pay $amount with UPI';
  }

  @override
  String get paySuccessTitle => 'You are covered';

  @override
  String policyNumber(Object number) {
    return 'Policy $number';
  }

  @override
  String get goHome => 'Go to home';

  @override
  String rainSoFar(Object mm) {
    return 'Rain so far $mm mm';
  }

  @override
  String normalRain(Object mm) {
    return 'Normal $mm mm';
  }

  @override
  String belowNormal(Object pct) {
    return '$pct% below normal';
  }

  @override
  String heaviestRain(Object days, Object mm) {
    return 'Heaviest $days-day rain $mm mm';
  }

  @override
  String nextPayoutAt(Object threshold) {
    return 'Next payout at $threshold';
  }

  @override
  String phaseUpcoming(Object date) {
    return 'Starts $date';
  }

  @override
  String get payouts => 'Payouts';

  @override
  String get noPayouts =>
      'No payouts yet. We pay automatically if rain crosses the limit.';

  @override
  String get offline => 'You are offline. Showing saved data';

  @override
  String get retry => 'Try again';

  @override
  String get logout => 'Log out';

  @override
  String acres(Object value) {
    return '$value acres';
  }

  @override
  String get errorNetwork => 'No internet. Check your connection and try again';

  @override
  String get errorGeneric => 'Something went wrong. Please try again';

  @override
  String get errorOtpInvalid => 'Wrong code. Please check and try again';

  @override
  String get errorOtpExpired => 'Code expired. Ask for a new code';

  @override
  String get errorRateLimited => 'Too many tries. Please wait and try again';

  @override
  String get errorVpaInvalid => 'This UPI ID could not be verified';

  @override
  String get errorGps => 'Location signal too weak. Move to open sky';

  @override
  String get errorAlreadyInsured => 'This field already has this cover';

  @override
  String get errorPhone => 'Enter a valid 10-digit mobile number';

  @override
  String phaseName(String phase) {
    String _temp0 = intl.Intl.selectLogic(phase, {
      'P1_SOWING': 'Sowing',
      'P2_GROWTH': 'Growth',
      'P3_GRAIN': 'Grain filling',
      'other': 'Whole season',
    });
    return '$_temp0';
  }

  @override
  String districtName(String code) {
    String _temp0 = intl.Intl.selectLogic(code, {
      'LATUR': 'Latur',
      'BEED': 'Beed',
      'DHARASHIV': 'Dharashiv',
      'NANDED': 'Nanded',
      'other': '-',
    });
    return '$_temp0';
  }

  @override
  String idTypeName(String code) {
    String _temp0 = intl.Intl.selectLogic(code, {
      'VOTER_ID': 'Voter ID',
      'RATION_CARD': 'Ration card',
      'PAN': 'PAN card',
      'AADHAAR': 'Aadhaar',
      'other': '-',
    });
    return '$_temp0';
  }

  @override
  String payoutStatus(String status) {
    String _temp0 = intl.Intl.selectLogic(status, {
      'AWAITING_BATCH': 'Approved, sending soon',
      'QUEUED': 'Sending',
      'SENT': 'Sent to bank',
      'SUCCESS': 'Received',
      'ACTION_REQUIRED': 'Update your UPI ID',
      'other': 'Processing',
    });
    return '$_temp0';
  }
}
