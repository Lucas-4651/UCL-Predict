# 📘 Documentation Technique de l'API Sporty Tech (Instant Leagues)

Cette documentation fournit une spécification complète pour l'intégration de l'API Sporty Tech. Elle est conçue pour permettre une implémentation robuste et performante. Toues le header sont respecter , pas d'ajout ni d'autre suppresion , pas besoin de cle.

Ceci n'est qu'un deco , Vous etes obliger de tester les api via curl

## 🌐 Informations de Base

*   **Base URL** : `https://hg-event-api-prod.sporty-tech.net/api/instantleagues`
*   **Protocole** : `HTTPS`
*   **Format de réponse** : `JSON (UTF-8)`
*   **Usage** : Récupération de données en temps réel pour les ligues de football virtuelles (VFL).

## 🔑 Authentification et Identification

L'API utilise une stratégie de **mimétisme de client** (Client Spoofing). Les requêtes sans les headers suivants seront probablement rejetées ou limiteront l'accès aux données.

| Header | Valeur Recommandée | Importance |
| :--- | :--- | :--- |
| `Accept` | `application/json, text/plain, */*` | 🔴 Critique |
| `User-Agent` | `Mozilla/5.0 (Linux; Android 10)` | 🔴 Critique |
| `App-Version` | `27869` | 🔴 Critique |
| `Origin` | `https://bet261.mg` | 🔴 Critique |
| `Referer` | `https://bet261.mg/` | 🔴 Critique |
| `Accept-Encoding` | `gzip, deflate` | 🟡 Optionnel (Performance) |

---

## 📍 Endpoints et Spécifications

### 1. Résultats des Matchs (`/results`)
Fournit l'historique des scores et les détails des tours.

*   **URL** : `/{league_id}/results`
*   **Méthode** : `GET`
*   **Pagination** :
    *   `skip` (int) : Décalage (offset) pour la page suivante.
    *   `take` (int) : Nombre de résultats par page.
*   **Réponse (Structure)** :
    ```json
    {
      "rounds": [
        {
          "id": 123,
          "roundNumber": 20,
          "expectedStart": "ISO8601-DATE",
          "expectedEnd": "ISO8601-DATE",
          "matches": [ { "...match_object..." } ]
        }
      ],
      "hasMore": boolean // Indique s'il existe d'autres pages de tours
    }
    ```

### 2. Calendrier et Détails des Matchs (`/matches`)
Fournit une vue détaillée des matchs et les types de paris associés.

*   **URL** : `/{league_id}/matches`
*   **Méthode** : `GET`
*   **Réponse (Structure)** :
    *   Similaire à `/results`, mais l'objet `match` contient :
        *   `round` (int) : ID du tour actuel.
        *   `eventBetTypes` (Array) : Liste des types de paris disponibles pour ce match.

### 3. Classements (`/ranking`)
Fournit la hiérarchie des équipes dans une ligue.

*   **URL** : `/{league_id}/ranking`
*   **Méthode** : `GET`
*   **Réponse (Structure)** :
    ```json
    {
      "teams": [
        {
          "name": "string",
          "points": number,
          "position": number,
          "won": number,
          "lost": number,
          "draw": number,
          "history": [ { "...history_item..." } ]
        }
      ]
    }
    ```

---

## 🌳 Hiérarchie des Objets (Schéma)

### Objet `Match` (Utilisé par `/results` et `/matches`)
```typescript
interface Match {
  id: number;
  name: string;            // Format: "Home vs Away"
  score: string;           // Format: "2:1"
  halfTimeScore: string;   // Format: "1:0"
  expectedStart: string;   // ISO8601
  homeTeam: Team;
  awayTeam: Team;
  goals: Goal[];
  // Uniquement pour /matches
  round?: number;
  eventBetTypes?: any[];
}

interface Team {
  name: string;
  points: number;
  position: number;
  won: number;
  lost: number;
  draw: number;
}

interface Goal {
  minute: number;
  homeScore: number;
  awayScore: number;
  team: "Home" | "Away";
}
```

---

## ⚠️ Gestion des Erreurs et Résilience

### Codes d'Erreur Probables
*   `403 Forbidden` : Headers manquants ou invalides (vérifiez `Origin` et `App-Version`).
*   `429 Too Many Requests` : Limitation de débit (Rate Limiting). Implémentez un délai exponentiel.
*   `503 Service Unavailable` : L'API Sporty Tech est en maintenance.

### Recommandations d'Implémentation
1.  **Circuit Breaker** : Utilisez une bibliothèque comme `opossum` pour éviter de saturer votre système en cas de panne de l'API.
2.  **Retry avec Backoff** : En cas d'erreur réseau ou de `429`, ne réessayez pas immédiatement. Utilisez un délai exponentiel (`base_delay * 2^attempt`).
3.  **Caching** : Les données de classement et de résultats ne changent pas à chaque seconde. Implémentez un cache local (ex: Redis ou mémoire) pour réduire la charge et améliorer la réactivité.

---

## 🚀 Exemple de Client Robuste (Node.js)

```javascript
const axios = require('axios');

class SportyClient {
  constructor(baseUrl) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
        'App-Version': '27869',
        'Origin': 'https://bet261.mg',
        'Referer': 'https://bet261.mg/'
      },
      timeout: 5000
    });
  }

  async getResults(leagueId, skip = 0, take = 10) {
    try {
      const { data } = await this.client.get(`/${leagueId}/results`, {
        params: { skip, take }
      });
      return data;
    } catch (err) {
      this._handleError(err);
    }
  }

  _handleError(err) {
    if (err.response?.status === 403) throw new Error('Auth Failed: Check Headers');
    if (err.response?.status === 429) throw new Error('Rate Limited: Slow down');
    throw err;
  }
}

// Usage
const sporty = new SportyClient('https://hg-event-api-prod.sporty-tech.net/api/instantleagues');
sporty.getResults(8035).then(console.log).catch(console.error);
```
