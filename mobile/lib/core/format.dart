import 'package:intl/intl.dart';

final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

/// Paise → "₹1,23,456" (Indian grouping, docs NFR-07).
String rupees(num paise) => _inr.format(paise / 100);

String shortDate(String isoDate, String locale) =>
    DateFormat.MMMd(locale).format(DateTime.parse(isoDate));

/// Shows 1 decimal only when needed: 5.0 → "5", 5.4 → "5.4".
String num1(num value) => value == value.roundToDouble() ? value.toStringAsFixed(0) : value.toStringAsFixed(1);
