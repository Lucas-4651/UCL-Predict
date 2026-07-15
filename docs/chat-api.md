# Chat communautaire — API & temps réel

Le chat communautaire est exposé sous `/api/chat/*` dans `src/routes/userRoutes.js`.
Il combine un historique classique (REST) et un flux temps réel (Server-Sent Events)
pour la diffusion des messages, réactions, présence et indicateur de saisie.

## Authentification

Trois routes mutantes (`POST`) sont protégées par `isChatAuthenticated`
(`src/middleware/authMiddleware.js`). Ce gardien **unifie** les sessions user et admin :

- `req.session.user` → `req.chatUser = { id, username, isAdmin: false }`
- `req.session.adminId` → `req.chatUser = { id, username: adminEmail, isAdmin: true }`

Les routes en `GET` (`/messages`, `/stream`) sont ouvertes en lecture ;
l'identité du client y est déduite directement de la session (ou `Invité`).

---

## Routes

### `GET /api/chat/messages`

Historique des messages récents.

- **Auth** : aucune (lecture publique).
- **Réponse** : `200` + tableau d'objets message (voir *Format message*).
- **Erreurs** : `500` `{ error }`.

```bash
curl http://localhost:3000/api/chat/messages
```

---

### `GET /api/chat/stream`  *(Server-Sent Events)*

Flux temps réel. Enregistre le client auprès de `realtimeService`, envoie l'état
initial puis diffuse les événements live.

- **Auth** : aucune (lecture), mais l'identité du client est résolue depuis la
  session (`user.id/username`, sinon `adminId/adminEmail`, sinon `Invité`).
- **Headers envoyés** : `text/event-stream`, `Cache-Control: no-cache`,
  `Connection: keep-alive`, `X-Accel-Buffering: no` (désactive le buffering proxy).
- **Événements diffusés** (`type` dans le payload JSON) :

| `type`      | Payload                                                | Déclencheur |
|-------------|--------------------------------------------------------|-------------|
| `init`      | `{ messages: [...] }`                                  | à la connexion (état initial) |
| `message`   | `{ message }`                                           | nouveau message (`POST /send`) |
| `reaction`  | `{ messageId, reactions: { emoji: count } }`            | toggle de réaction |
| `typing`    | `{ userId, username }`                                  | événement "en train d'écrire" |
| `presence`  | `{ online: [...], count }`                              | connexion / déconnexion client |

- **Nettoyage** : à la fermeture (`req.on('close')`), le client et sa présence
  sont retirés et une mise à jour `presence` est broadcastée.

```js
const es = new EventSource('/api/chat/stream');
es.onmessage = (e) => {
  const evt = JSON.parse(e.data);
  if (evt.type === 'message') render(evt.message);
};
```

---

### `POST /api/chat/typing`

Signale qu'un utilisateur est en train d'écrire (diffusé en temps réel).

- **Auth** : `isChatAuthenticated`.
- **Body** : vide (l'identité vient de `req.chatUser`).
- **Réponse** : `200` `{ ok: true }`.
- **Effet** : broadcast `{ type: 'typing', userId, username }`.
- **Erreurs** : `500` `{ error }`.

```bash
curl -X POST http://localhost:3000/api/chat/typing \
  -H "Content-Type: application/json" -d '{}'
```

---

### `POST /api/chat/react`

Ajoute ou retire une réaction (comportement **toggle**).

- **Auth** : `isChatAuthenticated` (l'`user_id` de la réaction = `req.chatUser.id`).
- **Body** :
  ```json
  { "messageId": 42, "reaction": "❤️" }
  ```
- **Validation** : `400` si `messageId` ou `reaction` manquant.
- **Logique** : si la paire `(message_id, user_id, reaction)` existe déjà →
  `removeReaction` (`action: "removed"`), sinon `addReaction` (`action: "added"`).
  La contrainte `UNIQUE (message_id, user_id, reaction)` sur `message_reactions`
  garantit un seul vote par utilisateur et par emoji.
- **Effet** : recalcule les compteurs et broadcast `{ type: 'reaction', messageId, reactions }`.
- **Réponse** : `200` `{ action, messageId, reaction }`.
- **Erreurs** : `400` / `500` `{ error }`.

```bash
curl -X POST http://localhost:3000/api/chat/react \
  -H "Content-Type: application/json" \
  -d '{"messageId": 42, "reaction": "❤️"}'
```

---

### `POST /api/chat/send`

Envoie un message (type `chat`).

- **Auth** : `isChatAuthenticated`.
- **Body** : `{ "content": "texte" }`.
- **Validation** : `400` si `content` vide.
- **Effet** : `chatService.sendMessage(userId, content, 'chat', { username, isAdmin })`
  puis broadcast `{ type: 'message', message }` à tous les clients connectés.
- **Réponse** : `200` + objet message complet.
- **Erreurs** : `400` / `500` `{ error }`.

```bash
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -d '{"content": "Bonjour la commu !"}'
```

---

## Format d'un message

Objet retourné par `chatService` (colonnes `messages` + dénormalisation auteur) :

```json
{
  "id": 42,
  "user_id": 7,
  "username": "Lucas",
  "is_admin": false,
  "content": "Bonjour la commu !",
  "type": "chat",          // 'chat' | 'broadcast'
  "is_pinned": false,
  "is_deleted": false,
  "created_at": "2026-07-15T12:00:00.000Z",
  "reactions": { "❤️": 2, "😂": 1 }
}
```

**Schéma de la base** (`src/config/dbInit.js`) :

- `messages` : `username TEXT`, `is_admin BOOLEAN` (dénormalisés pour l'affichage),
  `ON DELETE CASCADE` sur les réactions.
- `message_reactions` : `message_id`, `user_id`, `reaction`,
  `UNIQUE (message_id, user_id, reaction)`.

---

## Côté client

Le widget vit dans `src/views/partials/chat.ejs` (inclus par `predictions.ejs`).
Il consomme `/api/chat/messages` au chargement, ouvre un `EventSource` sur
`/api/chat/stream`, et publie via les routes `POST` ci-dessus. Le scroll de la
zone de messages est captif (`flex-1 min-h-0` + verrou `body{overflow:hidden}`
quand la fenêtre est ouverte) pour ne pas faire défiler la page de fond.
