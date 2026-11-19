import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en')];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'FasalShield'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'Crop cover that pays when the rain fails'**
  String get tagline;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @phoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Your mobile number'**
  String get phoneTitle;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'10-digit mobile number'**
  String get phoneHint;

  /// No description provided for @phoneHelp.
  ///
  /// In en, this message translates to:
  /// **'We will send a 6-digit code by SMS'**
  String get phoneHelp;

  /// No description provided for @sendCode.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get sendCode;

  /// No description provided for @otpTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the code'**
  String get otpTitle;

  /// No description provided for @otpSentTo.
  ///
  /// In en, this message translates to:
  /// **'Sent to {phone}'**
  String otpSentTo(Object phone);

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verify;

  /// No description provided for @resendIn.
  ///
  /// In en, this message translates to:
  /// **'Resend in {seconds}s'**
  String resendIn(Object seconds);

  /// No description provided for @resend.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get resend;

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @devCode.
  ///
  /// In en, this message translates to:
  /// **'Test code: {code}'**
  String devCode(Object code);

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'About you'**
  String get profileTitle;

  /// No description provided for @consentTitle.
  ///
  /// In en, this message translates to:
  /// **'Your data, your choice'**
  String get consentTitle;

  /// No description provided for @consentBody.
  ///
  /// In en, this message translates to:
  /// **'We use your name, phone and field location only to give you cover and send you money. Only your insurer sees it.'**
  String get consentBody;

  /// No description provided for @consentAgree.
  ///
  /// In en, this message translates to:
  /// **'I agree'**
  String get consentAgree;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @district.
  ///
  /// In en, this message translates to:
  /// **'District'**
  String get district;

  /// No description provided for @village.
  ///
  /// In en, this message translates to:
  /// **'Village'**
  String get village;

  /// No description provided for @idType.
  ///
  /// In en, this message translates to:
  /// **'ID document'**
  String get idType;

  /// No description provided for @idNumber.
  ///
  /// In en, this message translates to:
  /// **'ID number'**
  String get idNumber;

  /// No description provided for @idOptional.
  ///
  /// In en, this message translates to:
  /// **'Optional. Helps us pay you faster'**
  String get idOptional;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save and continue'**
  String get save;

  /// No description provided for @plotTitle.
  ///
  /// In en, this message translates to:
  /// **'Mark your field'**
  String get plotTitle;

  /// No description provided for @plotHelp.
  ///
  /// In en, this message translates to:
  /// **'Stand in your field and tap the button. Tap the map to move the pin.'**
  String get plotHelp;

  /// No description provided for @useMyLocation.
  ///
  /// In en, this message translates to:
  /// **'Use my location'**
  String get useMyLocation;

  /// No description provided for @accuracy.
  ///
  /// In en, this message translates to:
  /// **'Accuracy {meters} m'**
  String accuracy(Object meters);

  /// No description provided for @accuracyGood.
  ///
  /// In en, this message translates to:
  /// **'Good signal'**
  String get accuracyGood;

  /// No description provided for @accuracyPoor.
  ///
  /// In en, this message translates to:
  /// **'Weak signal. Move to open sky'**
  String get accuracyPoor;

  /// No description provided for @area.
  ///
  /// In en, this message translates to:
  /// **'Field size (acres)'**
  String get area;

  /// No description provided for @locationDenied.
  ///
  /// In en, this message translates to:
  /// **'Allow location to mark your field'**
  String get locationDenied;

  /// No description provided for @walletTitle.
  ///
  /// In en, this message translates to:
  /// **'Where should we send money'**
  String get walletTitle;

  /// No description provided for @walletHelp.
  ///
  /// In en, this message translates to:
  /// **'Enter your UPI ID. Payouts go only to this account.'**
  String get walletHelp;

  /// No description provided for @upiId.
  ///
  /// In en, this message translates to:
  /// **'UPI ID'**
  String get upiId;

  /// No description provided for @upiHint.
  ///
  /// In en, this message translates to:
  /// **'name@bank'**
  String get upiHint;

  /// No description provided for @verifyUpi.
  ///
  /// In en, this message translates to:
  /// **'Check UPI ID'**
  String get verifyUpi;

  /// No description provided for @upiVerifiedAs.
  ///
  /// In en, this message translates to:
  /// **'Registered name: {name}'**
  String upiVerifiedAs(Object name);

  /// No description provided for @thisIsMine.
  ///
  /// In en, this message translates to:
  /// **'Yes, this is my account'**
  String get thisIsMine;

  /// No description provided for @homeTitle.
  ///
  /// In en, this message translates to:
  /// **'Your covers'**
  String get homeTitle;

  /// No description provided for @buyCover.
  ///
  /// In en, this message translates to:
  /// **'Buy cover'**
  String get buyCover;

  /// No description provided for @emptyTitle.
  ///
  /// In en, this message translates to:
  /// **'No cover yet'**
  String get emptyTitle;

  /// No description provided for @emptyBody.
  ///
  /// In en, this message translates to:
  /// **'Protect your crop from dry spells and heavy rain. Money comes to your UPI automatically.'**
  String get emptyBody;

  /// No description provided for @coverAmount.
  ///
  /// In en, this message translates to:
  /// **'Cover'**
  String get coverAmount;

  /// No description provided for @paidOut.
  ///
  /// In en, this message translates to:
  /// **'Paid to you'**
  String get paidOut;

  /// No description provided for @statusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get statusActive;

  /// No description provided for @statusWaiting.
  ///
  /// In en, this message translates to:
  /// **'Starts soon'**
  String get statusWaiting;

  /// No description provided for @rainDataPending.
  ///
  /// In en, this message translates to:
  /// **'Waiting for rain data'**
  String get rainDataPending;

  /// No description provided for @rainDataPendingHelp.
  ///
  /// In en, this message translates to:
  /// **'Satellite readings for your field arrive within a day'**
  String get rainDataPendingHelp;

  /// No description provided for @payoutOnTheWay.
  ///
  /// In en, this message translates to:
  /// **'{amount} on the way'**
  String payoutOnTheWay(Object amount);

  /// No description provided for @cropTitle.
  ///
  /// In en, this message translates to:
  /// **'Which crop'**
  String get cropTitle;

  /// No description provided for @seasonLabel.
  ///
  /// In en, this message translates to:
  /// **'Season'**
  String get seasonLabel;

  /// No description provided for @quoteTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose your cover'**
  String get quoteTitle;

  /// No description provided for @youPay.
  ///
  /// In en, this message translates to:
  /// **'You pay'**
  String get youPay;

  /// No description provided for @sponsorPays.
  ///
  /// In en, this message translates to:
  /// **'Sponsor pays {amount}'**
  String sponsorPays(Object amount);

  /// No description provided for @whenPaid.
  ///
  /// In en, this message translates to:
  /// **'When you get paid'**
  String get whenPaid;

  /// No description provided for @droughtRule.
  ///
  /// In en, this message translates to:
  /// **'Rain {pct}% below normal'**
  String droughtRule(Object pct);

  /// No description provided for @floodRule.
  ///
  /// In en, this message translates to:
  /// **'{mm} mm rain in {days} days'**
  String floodRule(Object days, Object mm);

  /// No description provided for @choose.
  ///
  /// In en, this message translates to:
  /// **'Choose'**
  String get choose;

  /// No description provided for @payTitle.
  ///
  /// In en, this message translates to:
  /// **'Pay premium'**
  String get payTitle;

  /// No description provided for @premium.
  ///
  /// In en, this message translates to:
  /// **'Premium'**
  String get premium;

  /// No description provided for @subsidy.
  ///
  /// In en, this message translates to:
  /// **'Sponsor share'**
  String get subsidy;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'You pay'**
  String get total;

  /// No description provided for @payWithUpi.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount} with UPI'**
  String payWithUpi(Object amount);

  /// No description provided for @paySuccessTitle.
  ///
  /// In en, this message translates to:
  /// **'You are covered'**
  String get paySuccessTitle;

  /// No description provided for @policyNumber.
  ///
  /// In en, this message translates to:
  /// **'Policy {number}'**
  String policyNumber(Object number);

  /// No description provided for @goHome.
  ///
  /// In en, this message translates to:
  /// **'Go to home'**
  String get goHome;

  /// No description provided for @rainSoFar.
  ///
  /// In en, this message translates to:
  /// **'Rain so far {mm} mm'**
  String rainSoFar(Object mm);

  /// No description provided for @normalRain.
  ///
  /// In en, this message translates to:
  /// **'Normal {mm} mm'**
  String normalRain(Object mm);

  /// No description provided for @belowNormal.
  ///
  /// In en, this message translates to:
  /// **'{pct}% below normal'**
  String belowNormal(Object pct);

  /// No description provided for @heaviestRain.
  ///
  /// In en, this message translates to:
  /// **'Heaviest {days}-day rain {mm} mm'**
  String heaviestRain(Object days, Object mm);

  /// No description provided for @nextPayoutAt.
  ///
  /// In en, this message translates to:
  /// **'Next payout at {threshold}'**
  String nextPayoutAt(Object threshold);

  /// No description provided for @phaseUpcoming.
  ///
  /// In en, this message translates to:
  /// **'Starts {date}'**
  String phaseUpcoming(Object date);

  /// No description provided for @payouts.
  ///
  /// In en, this message translates to:
  /// **'Payouts'**
  String get payouts;

  /// No description provided for @noPayouts.
  ///
  /// In en, this message translates to:
  /// **'No payouts yet. We pay automatically if rain crosses the limit.'**
  String get noPayouts;

  /// No description provided for @offline.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Showing saved data'**
  String get offline;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logout;

  /// No description provided for @acres.
  ///
  /// In en, this message translates to:
  /// **'{value} acres'**
  String acres(Object value);

  /// No description provided for @errorNetwork.
  ///
  /// In en, this message translates to:
  /// **'No internet. Check your connection and try again'**
  String get errorNetwork;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again'**
  String get errorGeneric;

  /// No description provided for @errorOtpInvalid.
  ///
  /// In en, this message translates to:
  /// **'Wrong code. Please check and try again'**
  String get errorOtpInvalid;

  /// No description provided for @errorOtpExpired.
  ///
  /// In en, this message translates to:
  /// **'Code expired. Ask for a new code'**
  String get errorOtpExpired;

  /// No description provided for @errorRateLimited.
  ///
  /// In en, this message translates to:
  /// **'Too many tries. Please wait and try again'**
  String get errorRateLimited;

  /// No description provided for @errorVpaInvalid.
  ///
  /// In en, this message translates to:
  /// **'This UPI ID could not be verified'**
  String get errorVpaInvalid;

  /// No description provided for @errorGps.
  ///
  /// In en, this message translates to:
  /// **'Location signal too weak. Move to open sky'**
  String get errorGps;

  /// No description provided for @errorAlreadyInsured.
  ///
  /// In en, this message translates to:
  /// **'This field already has this cover'**
  String get errorAlreadyInsured;

  /// No description provided for @errorPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid 10-digit mobile number'**
  String get errorPhone;

  /// No description provided for @phaseName.
  ///
  /// In en, this message translates to:
  /// **'{phase, select, P1_SOWING{Sowing} P2_GROWTH{Growth} P3_GRAIN{Grain filling} other{Whole season}}'**
  String phaseName(String phase);

  /// No description provided for @districtName.
  ///
  /// In en, this message translates to:
  /// **'{code, select, LATUR{Latur} BEED{Beed} DHARASHIV{Dharashiv} NANDED{Nanded} other{-}}'**
  String districtName(String code);

  /// No description provided for @idTypeName.
  ///
  /// In en, this message translates to:
  /// **'{code, select, VOTER_ID{Voter ID} RATION_CARD{Ration card} PAN{PAN card} AADHAAR{Aadhaar} other{-}}'**
  String idTypeName(String code);

  /// No description provided for @payoutStatus.
  ///
  /// In en, this message translates to:
  /// **'{status, select, AWAITING_BATCH{Approved, sending soon} QUEUED{Sending} SENT{Sent to bank} SUCCESS{Received} ACTION_REQUIRED{Update your UPI ID} other{Processing}}'**
  String payoutStatus(String status);
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
