import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'chat_message.freezed.dart';
part 'chat_message.g.dart';

@freezed
class ChatMessage with _$ChatMessage {
  const factory ChatMessage({
    required int id,
    @JsonKey(name: 'user_id') int? userId,
    required String username,
    @JsonKey(name: 'is_admin') @Default(false) bool isAdmin,
    required String content,
    required String type,
    @JsonKey(name: 'is_pinned') @Default(false) bool isPinned,
    @JsonKey(name: 'is_deleted') @Default(false) bool isDeleted,
    @JsonKey(name: 'created_at') required String createdAt,
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
    @JsonKey(name: 'user_id') required int userId,
    required String username,
    @JsonKey(name: 'is_admin') required bool isAdmin,
  }) = _PresenceUser;

  factory PresenceUser.fromJson(Map<String, dynamic> json) => _$PresenceUserFromJson(json);
}

@JsonSerializable()
class ChatReactionRequest {
  @JsonKey(name: 'message_id')
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