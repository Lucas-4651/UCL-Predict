import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../theme/index.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/common.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
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
    _usernameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await context.read<AuthProvider>().register(
      _usernameController.text.trim(),
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
    final customColors = theme.extension<_AppCustomColors>()!;
    final authState = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _PitchLinesPainter(customColors.pitchLineColor),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 1.5,
                  colors: [
                    customColors.floodlightGlowColor,
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
                                  child: const Icon(Icons.rocket_launch, size: 32, color: Colors.orange),
                                ),
                                const SizedBox(height: AppSpacing.lg),
                                Text(
                                  'Rejoignez UCL-Predict',
                                  style: AppTextStyles.headlineMedium(isDark),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Initialisation de votre accès gratuit',
                                  style: AppTextStyles.bodyMedium(isDark).copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.xl),
                            if (authState.error != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                child: AppErrorMessage(
                                  message: authState.error!,
                                  onDismiss: () => context.read<AuthProvider>().clearError(),
                                ),
                              ),
                            AppInput(
                              controller: _usernameController,
                              label: 'Pseudo',
                              hint: 'Ex: FootMaster99',
                              textCapitalization: TextCapitalization.none,
                              validator: (value) {
                                if (value == null || value.isEmpty) return 'Pseudo requis';
                                if (value.length < 3) return 'Minimum 3 caractères';
                                if (value.length > 20) return 'Maximum 20 caractères';
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),
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
                            const SizedBox(height: AppSpacing.lg),
                            PrimaryButton(
                              label: 'Créer mon compte',
                              isLoading: authState.isLoading,
                              onPressed: _submit,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Déjà un compte ? ',
                                  style: AppTextStyles.bodyMedium(isDark).copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                  ),
                                ),
                                GhostButton(
                                  label: 'Se connecter',
                                  onPressed: () => context.go('/login'),
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