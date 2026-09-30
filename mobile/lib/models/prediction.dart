import 'package:freezed_annotation/freezed_annotation.dart';

part 'prediction.freezed.dart';
part 'prediction.g.dart';

@freezed
class Prediction with _$Prediction {
  const factory Prediction({
    required String match,
    required String outcomeName,
    required double outcomeConf,
    required String btts,
    required double bttsConf,
    required String ou,
    required double ouConf,
    required Odds odds,
    required Probabilities probabilities,
    required Lambdas lambdas,
    required Map<String, dynamic> factors,
    String? matchId,
    String? homeTeam,
    String? awayTeam,
  }) = _Prediction;

  factory Prediction.fromJson(Map<String, dynamic> json) => _$PredictionFromJson(json);
}

@freezed
class Odds with _$Odds {
  const factory Odds({
    required double home,
    required double draw,
    required double away,
  }) = _Odds;

  factory Odds.fromJson(Map<String, dynamic> json) => _$OddsFromJson(json);
}

@freezed
class Probabilities with _$Probabilities {
  const factory Probabilities({
    required Map<String, double> outcome,
    required Map<String, double> btts,
    required Map<String, double> ou,
  }) = _Probabilities;

  factory Probabilities.fromJson(Map<String, dynamic> json) => _$ProbabilitiesFromJson(json);
}

@freezed
class Lambdas with _$Lambdas {
  const factory Lambdas({
    required double home,
    required double away,
  }) = _Lambdas;

  factory Lambdas.fromJson(Map<String, dynamic> json) => _$LambdasFromJson(json);
}

@freezed
class PredictionsResponse with _$PredictionsResponse {
  const factory PredictionsResponse({
    required List<Prediction> predictions,
    required String systemState,
    bool? fromCache,
  }) = _PredictionsResponse;

  factory PredictionsResponse.fromJson(Map<String, dynamic> json) => _$PredictionsResponseFromJson(json);
}