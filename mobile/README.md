# UCL-Predict Mobile

Application mobile Flutter native pour la plateforme de prédictions football UCL-Predict.

## 🏗️ Architecture

```
mobile/
├── lib/
│   ├── main.dart                 # Point d'entrée + routing (go_router)
│   ├── models/                   # Modèles Dart (freezed + json_serializable)
│   │   ├── prediction.dart       # Prediction, Odds, Probabilities
│   │   ├── user.dart             # User, AuthResponse
│   │   └── chat_message.dart     # ChatMessage, PresenceUser
│   ├── services/                 # Couche services
│   │   ├── api_service.dart      # Client HTTP (Dio) + cookies + endpoints
│   │   └── storage_service.dart  # Stockage sécurisé (flutter_secure_storage)
│   ├── providers/                # State management (Provider)
│   │   ├── auth_provider.dart    # Auth state + login/register/logout
│   │   ├── predictions_provider.dart # Predictions + refresh
│   │   └── chat_provider.dart    # Chat messages + SSE/polling
│   ├── screens/                  # Écrans (pages)
│   │   ├── splash_screen.dart    # Écran de démarrage + health check
│   │   ├── home_screen.dart      # Landing page
│   │   ├── predictions_screen.dart # Liste des prédictions
│   │   ├── match_detail_screen.dart # Détail d'un match
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── register_screen.dart
│   │   └── chat_screen.dart      # Chat temps réel
│   ├── widgets/                  # Composants réutilisables
│   │   ├── cards.dart            # AppCard, AppCardHover, GlassCard
│   │   ├── prediction_widgets.dart # PredictionCard, MarketChip, OddsRow, ConfidenceBar
│   │   ├── chat_widgets.dart     # ChatBubble, TypingIndicator, EmojiPicker
│   │   └── common.dart           # Boutons, Inputs, Messages, EmptyState
│   ├── theme/                    # Design System Material 3
│   │   ├── app_colors.dart       # Couleurs (light/dark)
│   │   ├── app_text_styles.dart  # Typographie (Syne, Outfit, JetBrains Mono)
│   │   ├── app_theme.dart        # ThemeData complet
│   │   └── app_spacing.dart      # Espacement, rayons, ombres, durées
│   └── utils/
│       └── constants.dart        # URLs, clés storage, routes
├── android/                      # Config Android (Gradle)
├── test/                         # Tests unitaires
├── pubspec.yaml
└── SECURITY_REVIEW.md
```

## 🚀 Démarrage Rapide

### Prérequis
- Flutter SDK 3.22+
- Dart 3.4+
- Android Studio / VS Code (pour développement local)
- **Ou** GitHub Actions (build principal)

### Installation Locale
```bash
cd mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

### Build APK (Local)
```bash
flutter build apk --release --split-per-abi
# Sortie: build/app/outputs/flutter-apk/app-*-release.apk
```

### Build App Bundle (Play Store)
```bash
flutter build appbundle --release
# Sortie: build/app/outputs/bundle/release/app-release.aab
```

## 🔧 Configuration

### 1. API Backend
Modifier `lib/utils/constants.dart`:
```dart
static const String baseUrl = 'https://votre-api.com';
static const String apiBaseUrl = '$baseUrl';
```

### 2. Variables d'Environnement
Aucune variable secrète dans le code mobile. Tout reste côté backend Node.js.

### 3. Signature Android (Release)
Créer `android/key.properties` (ne pas commiter):
```properties
storePassword=****
keyPassword=****
keyAlias=upload
storeFile=../upload-keystore.jks
```

Générer le keystore:
```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

## 📱 Fonctionnalités

| Écran | Fonctionnalités |
|-------|----------------|
| **Splash** | Animation, health check API, redirection auto |
| **Home** | Hero, features grid, navigation predictions |
| **Predictions** | Liste temps réel, pull-to-refresh, skeleton loading, FAB refresh |
| **Match Detail** | 3 marchés (1X2/BTTS/O-U), probabilités, cotes, lambdas, facteurs |
| **Auth** | Login/Register, validation formulaires, secure storage |
| **Chat** | SSE/polling, réactions emoji, typing indicator, modération |

## 🎨 Design System

### Couleurs (CSS Variables → Dart)
| Variable | Light | Dark |
|----------|-------|------|
| `--fb-primary` | `#10B981` | `#34D399` |
| `--fb-bg` | `#F8FAFC` | `#000000` |
| `--fb-surface` | `#FFFFFF` | `#0A0A0A` |
| `--fb-text` | `#0F172A` | `#F1F5F9` |

### Typographie
- **Display**: Syne 700/800
- **Body**: Outfit 300/400/600
- **Mono**: JetBrains Mono 400/500

### Composants Clés
- `AppCard` / `AppCardHover` - Cartes avec hover/tap feedback
- `MarketChip` - Badge marché (1X2/BTTS/O-U) avec confiance
- `ConfidenceBar` - Barre de progression pourcentage
- `OddsRow` - Cotes 1/X/2 format compact
- `ChatBubble` - Style Messenger avec avatar, réactions, épinglage

## 🔄 CI/CD - GitHub Actions

Workflow principal: `.github/workflows/flutter-build.yml`

### Déclencheurs
- Push sur `main`/`master` (dossier `mobile/`)
- Pull Request
- Manuel (`workflow_dispatch`)
- Tag `v*` → Release GitHub auto

### Jobs
1. **analyze** - `flutter analyze` + `flutter test` + coverage
2. **build-apk** - APK split per ABI (arm64, armv7, x64)
3. **build-appbundle** - AAB pour Play Store

### Artifacts
- APKs conservés 30 jours
- AAB pour déploiement Play Store

## 🔒 Sécurité

Voir [SECURITY_REVIEW.md](SECURITY_REVIEW.md)

Points clés:
- ✅ Aucun secret dans le code Flutter
- ✅ Stockage sécurisé (Keychain/Keystore)
- ✅ HTTPS uniquement
- ✅ Session cookies gérés par Dio
- ✅ Backend = seule source de vérité

## 🧪 Tests

```bash
# Tests unitaires
flutter test

# Avec couverture
flutter test --coverage

# Analyse statique
flutter analyze
```

## 📦 Dépendances Principales

| Package | Usage |
|---------|-------|
| `go_router` | Navigation déclarative |
| `provider` | State management simple |
| `dio` + `cookie_jar` | HTTP client + gestion cookies |
| `flutter_secure_storage` | Stockage chiffré tokens |
| `freezed` + `json_serializable` | Modèles immuables + JSON |
| `google_fonts` | Polices Syne/Outfit/JetBrains |
| `shimmer` | Skeleton loading |

## 🐛 Dépannage

### Erreur "flutter: command not found"
```bash
export PATH="$PATH:/path/to/flutter/bin"
# Ou utiliser GitHub Actions pour le build
```

### Erreurs de génération freezed
```bash
dart run build_runner clean
dart run build_runner build --delete-conflicting-outputs
```

### APK trop gros
```bash
flutter build apk --release --split-per-abi
# Génère 3 APKs par architecture (~15-20 MB chacun)
```

## 📄 Licence

Projet privé - UCL-Predict / Lucas46 Tech Studio# trigger
# trigger
# trigger
# trigger
# trigger
# trigger
# trigger
# trigger
# trigger workflow with manual embedding fix
# trigger workflow with fixed Gradle dependency
# trigger workflow with flutter maven repo
# trigger with engine version debug
