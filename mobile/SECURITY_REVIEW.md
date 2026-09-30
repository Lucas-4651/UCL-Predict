# UCL-Predict Mobile - Security Review

## 🔒 Security Checklist

### ✅ Secrets Management
- [x] **No API keys in Flutter code** - All secrets remain in Node.js backend
- [x] **DATABASE_URL** - Only in backend `.env`, never in mobile
- [x] **JWT_SECRET / SESSION_SECRET** - Only in backend, never in mobile
- [x] **Sporty Tech credentials** - Spoofed headers stay on backend only
- [x] **Monetag zone IDs** - Public zone IDs only, no secret keys

### ✅ Authentication
- [x] **Session-based auth** - Cookies stored securely via `flutter_secure_storage`
- [x] **No password storage** - Passwords never stored on device
- [x] **Auto-logout on 401** - API service handles session expiry
- [x] **Secure cookie handling** - HttpOnly cookies managed by Dio + CookieManager

### ✅ Network Security
- [x] **HTTPS only** - All API calls use `https://` base URL
- [x] **Certificate validation** - Dio defaults to strict SSL validation
- [x] **Request timeout** - 15s timeout prevents hanging connections
- [x] **No plaintext HTTP** - Enforced by base URL configuration

### ✅ Data Protection
- [x] **Secure storage** - `flutter_secure_storage` with encrypted SharedPreferences (Android) / Keychain (iOS)
- [x] **No sensitive data in logs** - API service doesn't log request/response bodies
- [x] **Minimal permissions** - Only `INTERNET` permission needed

### ✅ Code Security
- [x] **No eval/dynamic code** - No `dart:mirrors`, no `eval`
- [x] **Input validation** - Form validators on all user inputs
- [x] **XSS prevention** - Chat messages escaped via `freezed` JSON serialization
- [x] **SQL injection not applicable** - No local SQLite, all data via API

### ⚠️ Items to Configure Before Release

#### 1. API Base URL
Update `lib/utils/constants.dart`:
```dart
static const String baseUrl = 'https://YOUR_PRODUCTION_DOMAIN.com';
```

#### 2. Certificate Pinning (Recommended for Production)
Add to `ApiService.init()`:
```dart
_dio.options.validateStatus = (status) => status != null && status < 500;
// Add custom HttpClientAdapter with pinned certificate
```

#### 3. App Signing
- Generate upload keystore: `keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
- Configure `android/key.properties` (add to .gitignore)
- Update `android/app/build.gradle` signing config

#### 4. Network Security Config (Android)
Create `android/app/src/main/res/xml/network_security_config.xml`:
```xml
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">your-api-domain.com</domain>
    <pin-set>
      <pin algorithm="SHA-256">BASE64_ENCODED_SHA256_OF_CERT</pin>
      <pin algorithm="SHA-256">BACKUP_PIN</pin>
    </pin-set>
  </domain-config>
</network-security-config>
```
Reference in `AndroidManifest.xml`:
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

#### 5. ProGuard/R8 Rules
Add to `android/app/proguard-rules.pro`:
```
-keep class com.tekartik.sqflite.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.plugins.**
```

#### 6. Dependency Audit
Run before each release:
```bash
flutter pub deps --style=compact
dart pub outdated --mode=json
```

### 🚫 Prohibited in Mobile Code
| Item | Reason |
|------|--------|
| `DATABASE_URL` | Database credentials |
| `JWT_SECRET` | Token signing key |
| `SESSION_SECRET` | Session encryption |
| Sporty Tech `Origin` header | API spoofing secret |
| Admin credentials | Privilege escalation |
| Payment keys (Stripe, etc.) | Financial data |

### 📱 Runtime Security
- **Root/Jailbreak detection** - Consider adding `flutter_jailbreak_detection` for high-security contexts
- **Screen capture prevention** - `FlutterWindowManager` flags for sensitive screens
- **Biometric auth** - Optional `local_auth` for re-authentication on sensitive actions

### 🔄 Incident Response
1. **API key rotation** - Backend-only, no mobile update needed
2. **Certificate expiry** - Monitor via GitHub Actions SSL check
3. **Dependency vulnerabilities** - Dependabot alerts on GitHub

---

**Last Reviewed**: $(date)
**Reviewer**: Architecture Team
**Next Review**: Before v1.0 release