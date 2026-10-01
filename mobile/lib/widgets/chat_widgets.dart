import 'package:flutter/material.dart';
import '../../models/chat_message.dart';
import '../../theme/index.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final String? currentUsername;
  final VoidCallback? onReactionTap;
  final bool showAvatar;

  const ChatBubble({
    super.key,
    required this.message,
    this.currentUsername,
    this.onReactionTap,
    this.showAvatar = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isMe = currentUsername != null &&
        !message.isAdmin &&
        !message.isBroadcast &&
        message.username.toLowerCase() == currentUsername!.toLowerCase();
    final isAdminMsg = message.isAdmin || message.isBroadcast;

    return Row(
      mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!isMe && showAvatar && !isAdminMsg) ...[
          _Avatar(username: message.username, isAdmin: message.isAdmin),
          const SizedBox(width: AppSpacing.xs),
        ] else if (isMe) ...[
          const SizedBox(width: 48),
        ],
        Flexible(
          child: Column(
            crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (!isMe && !isAdminMsg && showAvatar)
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 2),
                  child: Text(
                    message.username,
                    style: AppTextStyles.labelSmall(isDark).copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              Container(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.75,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.sm,
                ),
                decoration: BoxDecoration(
                  color: _getBubbleColor(theme, isDark, isMe, isAdminMsg),
                  borderRadius: _getBubbleRadius(isMe, isAdminMsg),
                  border: _getBubbleBorder(theme, isAdminMsg),
                ),
                child: Column(
                  crossAxisAlignment: isAdminMsg ? CrossAxisAlignment.center : CrossAxisAlignment.start,
                  children: [
                    if (isAdminMsg && message.isPinned)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Text(
                          '📌 Épinglé',
                          style: AppTextStyles.monoXSmall(isDark).copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    if (isAdminMsg)
                      Text(
                        '👑 ${message.username}',
                        style: AppTextStyles.labelSmall(isDark).copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    Text(
                      message.content,
                      style: AppTextStyles.bodyMedium(isDark).copyWith(
                        color: _getTextColor(theme, isDark, isMe, isAdminMsg),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          message.formattedTime,
                          style: AppTextStyles.monoXSmall(isDark).copyWith(
                            color: isMe
                                ? Colors.white.withOpacity(0.7)
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (message.reactions.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          ...message.reactions.entries.map((e) => _ReactionChip(
                            emoji: e.key,
                            count: e.value,
                            onTap: onReactionTap,
                          )),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              if (onReactionTap != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
                  child: _AddReactionButton(onTap: onReactionTap!),
                ),
            ],
          ),
        ),
        if (isMe && showAvatar) ...[
          const SizedBox(width: AppSpacing.xs),
          _Avatar(username: message.username, isAdmin: message.isAdmin),
        ],
      ],
    );
  }

  Color _getBubbleColor(ThemeData theme, bool isDark, bool isMe, bool isAdminMsg) {
    if (isAdminMsg) {
      return isDark ? theme.colorScheme.primaryContainer.withOpacity(0.3) : const Color(0xFFE7F3FF);
    }
    if (isMe) {
      return theme.colorScheme.primary;
    }
    return isDark ? theme.colorScheme.surfaceContainerHigh : theme.colorScheme.surface;
  }

  BorderRadius _getBubbleRadius(bool isMe, bool isAdminMsg) {
    if (isAdminMsg) {
      return BorderRadius.circular(AppRadius.xxl);
    }
    const radius = Radius.circular(AppRadius.xl);
    if (isMe) {
      return BorderRadius.only(
        topLeft: radius,
        topRight: radius,
        bottomLeft: radius,
        bottomRight: Radius.circular(AppRadius.sm),
      );
    }
    return BorderRadius.only(
      topLeft: radius,
      topRight: radius,
      bottomLeft: Radius.circular(AppRadius.sm),
      bottomRight: radius,
    );
  }

  Border? _getBubbleBorder(ThemeData theme, bool isAdminMsg) {
    if (isAdminMsg) {
      return Border.all(
        color: theme.colorScheme.primary.withOpacity(0.3),
        width: 1,
      );
    }
    return null;
  }

  Color _getTextColor(ThemeData theme, bool isDark, bool isMe, bool isAdminMsg) {
    if (isMe) return Colors.white;
    if (isAdminMsg) return isDark ? theme.colorScheme.onSurface : theme.colorScheme.onSurface;
    return theme.colorScheme.onSurface;
  }
}

class _Avatar extends StatelessWidget {
  final String username;
  final bool isAdmin;

  const _Avatar({required this.username, this.isAdmin = false});

  @override
  Widget build(BuildContext context) {
    final color = _avatarColor(username);
    final initial = username.isNotEmpty ? username[0].toUpperCase() : '?';

    return CircleAvatar(
      radius: 16,
      backgroundColor: color,
      child: isAdmin
          ? const Icon(Icons.shield, size: 14, color: Colors.white)
          : Text(
              initial,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
    );
  }

  Color _avatarColor(String name) {
    final colors = [
      const Color(0xFFF43F5E), // rose
      const Color(0xFFF97316), // orange
      const Color(0xFFF59E0B), // amber
      const Color(0xFF10B981), // emerald
      const Color(0xFF14B8A6), // teal
      const Color(0xFF06B6D4), // sky
      const Color(0xFF6366F1), // indigo
      const Color(0xFFA855F7), // violet
      const Color(0xFFEC4899), // fuchsia
    ];
    int hash = 0;
    for (int i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.codeUnitAt(i)) & 0xFFFFFFFF;
    }
    return colors[hash % colors.length];
  }
}

class _ReactionChip extends StatelessWidget {
  final String emoji;
  final int count;
  final VoidCallback? onTap;

  const _ReactionChip({
    required this.emoji,
    required this.count,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.round),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: isDark ? theme.colorScheme.surfaceContainerHigh : theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadius.round),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 10)),
            const SizedBox(width: 2),
            Text(
              count.toString(),
              style: AppTextStyles.monoXSmall(isDark).copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AddReactionButton extends StatefulWidget {
  final VoidCallback onTap;

  const _AddReactionButton({required this.onTap});

  @override
  State<_AddReactionButton> createState() => _AddReactionButtonState();
}

class _AddReactionButtonState extends State<_AddReactionButton> {
  bool _showPicker = false;
  final List<String> _emojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (_showPicker)
          Container(
            margin: const EdgeInsets.only(bottom: 4),
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: theme.colorScheme.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: theme.customColors.scorecardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: _emojis.map((e) => InkWell(
                onTap: () {
                  widget.onTap();
                  setState(() => _showPicker = false);
                },
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Padding(
                  padding: const EdgeInsets.all(6),
                  child: Text(e, style: const TextStyle(fontSize: 18)),
                ),
              )).toList(),
            ),
          ),
        InkWell(
          onTap: () => setState(() => _showPicker = !_showPicker),
          borderRadius: BorderRadius.circular(AppRadius.round),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadius.round),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('😊', style: const TextStyle(fontSize: 10)),
                const SizedBox(width: 4),
                Text(
                  'Réagir',
                  style: AppTextStyles.labelSmall(isDark).copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class TypingIndicator extends StatefulWidget {
  final String username;

  const TypingIndicator({super.key, required this.username});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
      child: Row(
        children: [
          const _Avatar(username: '', isAdmin: false),
          const SizedBox(width: 8),
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Row(
                children: List.generate(3, (index) {
                  final delay = index * 0.15;
                  final value = (_controller.value + delay) % 1.0;
                  final scale = 0.5 + 0.5 * (1 - (value - 0.5).abs() * 2);
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    width: 6,
                    height: 6,
                    transform: Matrix4.diagonal3Values(scale, scale, 1),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.onSurfaceVariant.withOpacity(0.6),
                      shape: BoxShape.circle,
                    ),
                  );
                }),
              );
            },
          ),
          const SizedBox(width: 8),
          Text(
            '${widget.username} écrit…',
            style: AppTextStyles.bodySmall(isDark).copyWith(
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}