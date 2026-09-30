import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/index.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  late final Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.6, curve: Curves.easeOut)),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: const Interval(0.2, 0.8, curve: Curves.easeOutCubic)));

    _controller.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(authProvider.notifier).login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (success && mounted) {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _PitchLinesPainter(theme.customColors.pitchLineColor),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 1.5,
                  colors: [
                    theme.customColors.floodlightGlowColor,
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: SlideTransition(
                    position: _slideAnimation,
                    child: AppCard(
                      padding: const EdgeInsets.all(AppSpacing.xl),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Header
                            Column(
                              children: [
                                Container(
                                  width: 64,
                                  height: 64,
                                  decoration: BoxDecoration(
                                    color: theme.colorScheme.primaryContainer,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: theme.colorScheme.primary.withOpacity(0.2),
                                    ),
                                  ),
                                  child: Icon(Icons.trophy, size: 32, color: theme.colorScheme.primary),
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                Text(
                                  'Bon retour !',
                                  style: AppTextStyles.headlineMedium(isDark),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Authentification au Terminal UCL-Predict',
                                  style: AppTextStyles.bodyMedium(isDark).copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),

                            const SizedBox(height: AppSpacing.xl),

                            // Error
                            if (authState.error != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                child: AppErrorMessage(
                                  message: authState.error!,
                                  onDismiss: () => ref.read(authProvider.notifier).clearError(),
                                ),
                              ),

                            // Email
                            AppInput(
                              controller: _emailController,
                              label: 'Adresse Email',
                              hint: 'nom@exemple.com',
                              keyboardType: TextInputType.emailAddress,
                              textCapitalization: TextCapitalization.none,
                              validator: (value) {
                                if (value == null || value.isEmpty) return 'Email requis';
                                if (!value.contains('@')) return 'Email invalide';
                                return null;
                              },
                            ),

                            const SizedBox(height: AppSpacing.md),

                            // Password
                            AppInput(
                              controller: _passwordController,
                              label: 'Mot de passe',
                              hint: '••••••••',
                              obscureText: _obscurePassword,
                              suffixIcon: _obscurePassword ? Icons.visibility_off : Icons.visibility,
                              onSuffixTap: () => setState(() => _obscurePassword = !_obscurePassword),
                              validator: (value) {
                                if (value == null || value.isEmpty) return 'Mot de passe requis';
                                if (value.length < 6) return 'Minimum 6 caractères';
                                return null;
                              },
                            ),

                            const SizedBox(height: AppSpacing.xs),

                            // Forgot password
                            Align(
                              alignment: Alignment.centerRight,
                              child: GhostButton(
                                label: 'Mot de passe oublié ?',
                                onPressed: () {},
                              ),
                            ),

                            const SizedBox(height: AppSpacing.lg),

                            // Submit
                            PrimaryButton(
                              label: 'Se connecter',
                              isLoading: authState.isLoading,
                              onPressed: _submit,
                            ),

                            const SizedBox(height: AppSpacing.lg),

                            // Register link
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Pas encore de compte ? ',
                                  style: AppTextStyles.bodyMedium(isDark).copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                                GhostButton(
                                  label: 'S\'inscrire gratuitement',
                                  onPressed: () => context.go('/register'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PitchLinesPainter extends CustomPainter {
  final Color color;
  _PitchLinesPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color..strokeWidth = 0.5;
    const spacing = 60.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}