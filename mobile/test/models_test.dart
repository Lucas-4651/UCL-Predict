import 'package:flutter_test/flutter_test.dart';
import 'package:ucl_predict_mobile/models/prediction.dart';
import 'package:ucl_predict_mobile/models/user.dart';
import 'package:ucl_predict_mobile/models/chat_message.dart';

void main() {
  group('Prediction Model Tests', () {
    test('Prediction fromJson creates correct object', () {
      final json = {
        'match': 'Real Madrid vs Bayern',
        'outcomeName': 'Real Madrid',
        'outcomeConf': 0.62,
        'btts': 'Yes',
        'bttsConf': 0.71,
        'ou': 'Over',
        'ouConf': 0.68,
        'odds': {'home': 1.85, 'draw': 3.40, 'away': 4.20},
        'probabilities': {
          'outcome': {'1': 0.62, 'X': 0.22, '2': 0.16},
          'btts': {'Yes': 0.71, 'No': 0.29},
          'ou': {'Over': 0.68, 'Under': 0.32}
        },
        'lambdas': {'home': 1.9, 'away': 1.1},
        'factors': {'outcome_ranking': 0.5, 'outcome_form': 0.3}
      };

      final prediction = Prediction.fromJson(json);

      expect(prediction.match, 'Real Madrid vs Bayern');
      expect(prediction.outcomeName, 'Real Madrid');
      expect(prediction.outcomeConf, 0.62);
      expect(prediction.btts, 'Yes');
      expect(prediction.odds.home, 1.85);
      expect(prediction.probabilities.outcome['1'], 0.62);
      expect(prediction.lambdas.home, 1.9);
    });

    test('Odds fromJson works correctly', () {
      final json = {'home': 2.0, 'draw': 3.0, 'away': 4.0};
      final odds = Odds.fromJson(json);
      expect(odds.home, 2.0);
      expect(odds.draw, 3.0);
      expect(odds.away, 4.0);
    });
  });

  group('User Model Tests', () {
    test('User fromJson and isAdmin works', () {
      final json = {'id': 1, 'username': 'admin', 'email': 'admin@test.com', 'role': 'admin'};
      final user = User.fromJson(json);
      expect(user.id, 1);
      expect(user.username, 'admin');
      expect(user.isAdmin, true);
    });

    test('Regular user isAdmin is false', () {
      final json = {'id': 2, 'username': 'user', 'email': 'user@test.com', 'role': 'user'};
      final user = User.fromJson(json);
      expect(user.isAdmin, false);
    });
  });

  group('ChatMessage Model Tests', () {
    test('ChatMessage fromJson parses correctly', () {
      final json = {
        'id': 1,
        'userId': null,
        'username': 'FootMaster99',
        'isAdmin': false,
        'content': 'Great prediction!',
        'type': 'chat',
        'isPinned': false,
        'isDeleted': false,
        'createdAt': '2026-01-15T20:30:00Z',
        'reactions': {'👍': 3, '❤️': 1}
      };

      final message = ChatMessage.fromJson(json);
      expect(message.id, 1);
      expect(message.username, 'FootMaster99');
      expect(message.content, 'Great prediction!');
      expect(message.reactions['👍'], 3);
      expect(message.formattedTime.isNotEmpty, true);
    });
  });
}