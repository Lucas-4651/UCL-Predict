import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/index.dart';
import '../providers/chat_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/index.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with SingleTickerProviderStateMixin {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  Timer? _sseTimer;
  bool _showEmojiPicker = false;
  int? _activeMessageId;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _connectSSE();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _sseTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    await context.read<ChatProvider>().loadMessages();
  }

  void _connectSSE() {
    _sseTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) {
        context.read<ChatProvider>().loadMessages();
      }
    });
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  Future<void> _sendMessage() async {
    final content = _inputController.text.trim();
    if (content.isEmpty) return;

    _inputController.clear();
    setState(() => _showEmojiPicker = false);

    try {
      await context.read<ChatProvider>().sendMessage(content);
      _scrollToBottom();
    } catch (_) {}
  }

  void _toggleEmojiPicker(int messageId) {
    setState(() {
      _activeMessageId = messageId;
      _showEmojiPicker = !_showEmojiPicker;
    });
  }

  void _handleReaction(int messageId, String emoji) async {
    await context.read<ChatProvider>().toggleReaction(messageId, emoji);
    setState(() {
      _showEmojiPicker = false;
      _activeMessageId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final customColors = theme.extension<AppCustomColors>()!;
    final chatState = context.watch<ChatProvider>();
    final authState = context.watch<AuthProvider>();
    final currentUsername = authState.user?.username;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.chat_bubble_outline, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 10),
            Text('Chat UCL-Predict', style: AppTextStyles.titleMedium(isDark)),
          ],
        ),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: chatState.isConnected ? theme.colorScheme.primary.withOpacity(0.15) : Colors.grey.withOpacity(0.15),
              borderRadius: BorderRadius.circular(AppRadius.round),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: chatState.isConnected ? theme.colorScheme.primary : Colors.grey,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '${chatState.onlineCount} en ligne',
                  style: AppTextStyles.monoSmall(isDark).copyWith(
                    color: chatState.isConnected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _PitchLinesPainter(customColors.pitchLineColor),
            ),
          ),
          Column(
            children: [
              if (chatState.typingUser != null)
                TypingIndicator(username: chatState.typingUser!),
              Expanded(
                child: chatState.isLoading && chatState.messages.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : chatState.messages.isEmpty
                        ? EmptyState(
                            icon: Icons.chat_bubble_outline,
                            title: 'Aucun message',
                            subtitle: 'Soyez le premier à écrire !',
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(AppSpacing.md),
                            reverse: true,
                            itemCount: chatState.messages.length,
                            itemBuilder: (context, index) {
                              final message = chatState.messages[index];
                              return Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                                child: ChatBubble(
                                  message: message,
                                  currentUsername: currentUsername,
                                  onReactionTap: () => _toggleEmojiPicker(message.id),
                                ),
                              );
                            },
                          ),
              ),
              if (_showEmojiPicker && _activeMessageId != null)
                _EmojiPicker(
                  messageId: _activeMessageId!,
                  onEmojiSelected: _handleReaction,
                  onClose: () => setState(() => _showEmojiPicker = false),
                ),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  border: Border(
                    top: BorderSide(color: customColors.scorecardBorder, width: 1),
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _inputController,
                          style: AppTextStyles.bodyMedium(isDark),
                          decoration: InputDecoration(
                            hintText: 'Écrivez un message...',
                            hintStyle: AppTextStyles.bodyMedium(isDark).copyWith(
                              color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                            ),
                            filled: true,
                            fillColor: theme.colorScheme.surfaceContainerHighest,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: AppSpacing.sm,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(AppRadius.round),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          onSubmitted: (_) => _sendMessage(),
                          onChanged: (_) => context.read<ChatProvider>().sendTyping(),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      IconButton.filled(
                        onPressed: _sendMessage,
                        icon: const Icon(Icons.send, size: 20),
                        style: IconButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmojiPicker extends StatelessWidget {
  final int messageId;
  final Function(int, String) onEmojiSelected;
  final VoidCallback onClose;
  final List<String> _emojis = const ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const _EmojiPicker({
    required this.messageId,
    required this.onEmojiSelected,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final customColors = theme.extension<AppCustomColors>()!;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(
          top: BorderSide(color: customColors.scorecardBorder, width: 1),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.1),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Réagir', style: AppTextStyles.titleSmall(isDark)),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: onClose,
              ),
            ],
          ),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: _emojis.map((emoji) => InkWell(
              onTap: () => onEmojiSelected(messageId, emoji),
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Text(emoji, style: const TextStyle(fontSize: 24)),
              ),
            )).toList(),
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