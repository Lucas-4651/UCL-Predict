import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required int id,
    required String username,
    required String email,
    required String role,
    String? createdAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

extension UserExtension on User {
  bool get isAdmin => role == 'admin';
}

@freezed
class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required bool success,
    String? message,
    User? user,
    String? error,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
}