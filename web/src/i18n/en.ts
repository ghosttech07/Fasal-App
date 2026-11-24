/**
 * English master catalogue. Every other language is a partial copy of these keys; a missing key shows the
 * English text (never a blank). {name} placeholders are filled by t(key, { name }).
 */
export const en = {
  // common
  'c.back': 'Back',
  'c.next': 'Next',
  'c.skip': 'Skip',
  'c.tagline': 'Crop cover that pays when the rain fails',
  'c.language': 'Language',

  // language picker
  'lang.title': 'Choose your language',
  'lang.sub': 'You can change it later in your account',

  // start: story
  'start.s1.title': 'Cover that pays when the rain fails',
  'start.s1.body':
    'Before you buy, you see exactly how much rain pays how much money. No claim forms, ever.',
  'start.s2.title': 'A satellite watches your field',
  'start.s2.body':
    'Every day it measures the rain on your field. When rain falls below a mark, that mark is passed.',
  'start.s3.title': 'Money comes to your UPI by itself',
  'start.s3.body':
    'When a mark is passed, the money reaches your UPI within a day, with an SMS. You do nothing.',
  'start.rate': 'Rain {pct}% below normal',
  'start.cap': 'Dry Spell Cover, sowing phase, 2 acres',
  'start.less': 'less rain than normal',
  'start.paid': 'PAID',
  'start.paidSub': 'Sent to your UPI within a day, with an SMS',
  'start.step': 'Step {n} of 3',
  'start.getStarted': 'Get started',

  // start: before you start
  'bys.title': 'Before you start',
  'bys.sub': 'Four things to know, in plain words',
  'bys.t1b': 'Payouts follow measured rain.',
  'bys.t1':
    'A satellite measures rain for your area. Your own field can get a little more or less.',
  'bys.t2b': 'Your premium goes to the insurer,',
  'bys.t2': 'not to this app. In a normal year nothing is paid out.',
  'bys.t3b': 'We check who you are.',
  'bys.t3': 'Your UPI name, and an ID before large payouts.',
  'bys.t4b': 'Your data stays private.',
  'bys.t4': 'Only your insurer sees it. You can ask us to delete it.',
  'bys.full': 'Full text:',
  'bys.terms': 'Terms of use',
  'bys.privacy': 'Privacy',
  'bys.complaints': 'Complaints',
  'bys.allow': 'Allow on this phone',
  'bys.notif': 'Notifications',
  'bys.notifSub': 'When money is sent or rain nears a mark',
  'bys.loc': 'Location',
  'bys.locSub': 'To mark your field on the map',
  'bys.later': 'You can skip these and allow them later.',
  'bys.off': 'Turned off. You can change this in your phone settings.',
  'bys.allowBtn': 'Allow',
  'bys.allowed': 'Allowed',
  'bys.offBtn': 'Off',
  'bys.agree': 'I have read this and I agree',
  'bys.continue': 'Agree and continue',

  // sign in
  'login.belowNormal': '{pct}% below normal',
  'login.phone': 'Your mobile number',
  'login.digits': '10 digits',
  'login.hint': 'We send a 6-digit code by SMS. No password needed.',
  'login.invalid': 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.',
  'login.send': 'Send code',
  'login.sending': 'Sending code',

  // OTP
  'otp.title': 'Enter the 6-digit code',
  'otp.sentTo': 'Sent by SMS to',
  'otp.label': 'Code from the SMS',
  'otp.digits': '6 digits',
  'otp.test': 'Test code',
  'otp.again': 'Send the code again',
  'otp.againIn': 'Send again in',
  'otp.change': 'Change number',
  'otp.verify': 'Verify and continue',
  'otp.checking': 'Checking',
} as const;

export type Key = keyof typeof en;
export type Dict = Partial<Record<Key, string>>;
