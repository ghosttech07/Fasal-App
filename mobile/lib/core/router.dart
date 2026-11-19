import 'package:go_router/go_router.dart';

import '../features/auth/presentation/otp_screen.dart';
import '../features/auth/presentation/phone_screen.dart';
import '../features/auth/presentation/start_screen.dart';
import '../features/cover/presentation/crop_screen.dart';
import '../features/cover/presentation/pay_screen.dart';
import '../features/cover/presentation/quote_screen.dart';
import '../features/onboarding/presentation/plot_screen.dart';
import '../features/onboarding/presentation/profile_screen.dart';
import '../features/onboarding/presentation/wallet_screen.dart';
import '../features/policies/presentation/home_screen.dart';
import '../features/policies/presentation/policy_detail_screen.dart';
import 'providers.dart';

const _publicRoutes = {'/login', '/otp'};

GoRouter buildRouter(Session session) => GoRouter(
      initialLocation: '/start',
      refreshListenable: session,
      redirect: (context, state) {
        final path = state.matchedLocation;
        if (!session.loggedIn) return _publicRoutes.contains(path) ? null : '/login';
        if (_publicRoutes.contains(path)) return '/start'; // logged in → resume onboarding / home
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (_, _) => const PhoneScreen()),
        GoRoute(path: '/otp', builder: (_, s) => OtpScreen(args: s.extra! as Json)),
        GoRoute(path: '/start', builder: (_, _) => const StartScreen()),
        GoRoute(path: '/onboarding/profile', builder: (_, _) => const ProfileScreen()),
        GoRoute(path: '/onboarding/plot', builder: (_, _) => const PlotScreen()),
        GoRoute(path: '/onboarding/wallet', builder: (_, _) => const WalletScreen()),
        GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
        GoRoute(path: '/cover/crop', builder: (_, _) => const CropScreen()),
        GoRoute(path: '/cover/quote', builder: (_, s) => QuoteScreen(args: s.extra! as Json)),
        GoRoute(path: '/cover/pay', builder: (_, s) => PayScreen(args: s.extra! as Json)),
        GoRoute(path: '/policy/:id', builder: (_, s) => PolicyDetailScreen(id: s.pathParameters['id']!)),
      ],
    );
