import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required int id,
    int? userId,
    required String username,
    required bool isAdmin,
    required String content,
    required String type,
    required bool isPinned,
    required bool isDeleted,
    required String createdAt,
    @Default({}) Map<String, int> reactions,
  }) = _ChatMessage;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => _$ChatMessageFromJson(json);
}

extension ChatMessageExtension on ChatMessage {
  DateTime get createdAtDateTime => DateTime.parse(createdAt).toLocal();

  String get formattedTime => _formatTime(createdAtDateTime);

  static String _formatTime(DateTime dt) {
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  bool get isBroadcast => type == 'broadcast';
}

@freezed
class PresenceUser with _$PresenceUser {
  const factory PresenceUser({
    required int userId,
    required String username,
    required bool isAdmin,
  }) = _PresenceUser;

  factory PresenceUser.fromJson(Map<String, dynamic> json) => _$PresenceUserFromJson(json);
}

@JsonSerializable()
class ChatReactionRequest {
  final int messageId;
  final String reaction;

  ChatReactionRequest({required this.messageId, required this.reaction});

  factory ChatReactionRequest.fromJson(Map<String, dynamic> json) => _$ChatReactionRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ChatReactionRequestToJson(this);
}

@JsonSerializable()
class ChatSendRequest {
  final String content;

  ChatSendRequest({required this.content});

  factory ChatSendRequest.fromJson(Map<String, dynamic> json) => _$ChatSendRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ChatSendRequestToJson(this);
}