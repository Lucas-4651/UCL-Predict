import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/chat_message.dart';
import '../services/api_service.dart';

class ChatProvider with ChangeNotifier {
  final ApiService _api = ApiService();

  List<ChatMessage> _messages = [];
  List<PresenceUser> _presence = [];
  String? _typingUser;
  Timer? _typingTimer;
  bool _isLoading = false;
  bool _isConnected = false;
  String? _error;
  StreamSubscription? _sseSubscription;

  List<ChatMessage> get messages => _messages;
  List<PresenceUser> get presence => _presence;
  String? get typingUser => _typingUser;
  bool get isLoading => _isLoading;
  bool get isConnected => _isConnected;
  String? get error => _error;
  int get onlineCount => _presence.length;

  Future<void> loadMessages() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final msgs = await _api.getChatMessages();
      _messages = msgs;
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
      _messages = [];
    } catch (e) {
      _error = 'Erreur: $e';
      _messages = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendMessage(String content) async {
    if (content.trim().isEmpty) return;

    try {
      final message = await _api.sendChatMessage(content.trim());
      _messages = [message, ..._messages];
      notifyListeners();
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> toggleReaction(int messageId, String reaction) async {
    try {
      final reactions = await _api.toggleReaction(messageId, reaction);
      final index = _messages.indexWhere((m) => m.id == messageId);
      if (index != -1) {
        _messages[index] = _messages[index].copyWith(reactions: reactions);
        notifyListeners();
      }
    } on ApiException catch (e) {
      _error = e.message;
      notifyListeners();
    }
  }

  void sendTyping() {
    _api.sendTypingIndicator().catchError((_) {});
  }

  void setTypingUser(String? username) {
    _typingUser = username;
    _typingTimer?.cancel();
    if (username != null) {
      _typingTimer = Timer(const Duration(seconds: 3), () {
        if (_typingUser == username) {
          _typingUser = null;
          notifyListeners();
        }
      });
    }
    notifyListeners();
  }

  void updatePresence(List<PresenceUser> users) {
    _presence = users;
    notifyListeners();
  }

  void addMessage(ChatMessage message) {
    _messages = [message, ..._messages];
    notifyListeners();
  }

  void updateMessage(int messageId, Map<String, dynamic> updates) {
    final index = _messages.indexWhere((m) => m.id == messageId);
    if (index != -1) {
      _messages[index] = _messages[index].copyWith(
        isPinned: updates['is_pinned'] ?? _messages[index].isPinned,
        isDeleted: updates['is_deleted'] ?? _messages[index].isDeleted,
        content: updates['content'] ?? _messages[index].content,
      );
      notifyListeners();
    }
  }

  void removeMessage(int messageId) {
    _messages.removeWhere((m) => m.id == messageId);
    notifyListeners();
  }

  void setConnectionStatus(bool connected) {
    _isConnected = connected;
    notifyListeners();
  }

  void setSseSubscription(StreamSubscription sub) {
    _sseSubscription = sub;
  }

  @override
  void dispose() {
    _typingTimer?.cancel();
    _sseSubscription?.cancel();
    super.dispose();
  }
}