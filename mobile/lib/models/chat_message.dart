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

@freezed
class ChatReactionRequest with _$ChatReactionRequest {
  const factory ChatReactionRequest({
    required int messageId,
    required String reaction,
  }) = _ChatReactionRequest;

  factory ChatReactionRequest.fromJson(Map<String, dynamic> json) => _$ChatReactionRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ChatReactionRequestToJson(this);
}

@freezed
class ChatSendRequest with _$ChatSendRequest {
  const factory ChatSendRequest({
    required String content,
  }) = _ChatSendRequest;

  factory ChatSendRequest.fromJson(Map<String, dynamic> json) => _$ChatSendRequestFromJson(json);
  Map<String, dynamic> toJson() => _$ChatSendRequestToJson(this);
}