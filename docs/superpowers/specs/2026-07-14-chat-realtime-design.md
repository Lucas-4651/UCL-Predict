# Chat Temps Réel — Design Spec

**Date:** 2026-07-14
**Status:** Validé (brainstorming)
**Objectif:** Remplacer le polling 4s du chat communautaire par un canal temps réel (SSE) pour obtenir des messages instantanés, un indicateur de frappe, la présence, et des notifications — sans sur-ingénierie, sur un serveur Node persistant mono-instance.

## Contexte

Le chat communautaire (`src/views/partials/chat.ejs`) rafraîchit l'historique via `setInterval(fetchMessages, 4000)` dans `chatService.getRecentMessages()`. Cela crée jusqu'à ~15 requêtes GET/min par client, une latence perçue de 0–4 s, et inonde la DB de lectures redondantes. Le `ChatService` supporte déjà réactions emoji, messages épinglés (pinned), et broadcasts admin. L'hébergement est un **serveur Node persistant** (pas serverless, pas multi-instance) → WebSocket/SSE natif possible sans couche externe (Redis).

## Approche choisie

**SSE (Server-Sent Events) + bus d'événements interne (EventEmitter).** SSE est unidirectionnel (serveur→client) via HTTP standard : le client ouvre `GET /api/chat/stream` avec `Accept: text/event-stream`, le serveur écrit des blocs `data: {...}\n\n` à chaque événement. L'envoi de messages reste un `POST` classique. `EventSource` gère nativement la reconnexion (avec `Last-Event-ID`) et traverse les proxys (ex: Render) sans config WebSocket.

On rejette WebSocket/socket.io (surkill pour un besoin read-mostly, plus lourd, config proxy) et le long-polling (moins instantané, connexions consommées).

## Section 1 — Architecture temps réel (noyau)

### Nouveau module : `src/services/realtimeService.js`
- Expose un `EventEmitter` partagé (singleton) comme bus central.
- Maintient un `Set` des clients SSE connectés (références `res`).
- Maintient une `Map` de présence (`userId`/session → identité) — voir Section 2.
- `broadcast(event)` : écrit `data: ${JSON.stringify(event)}\n\n` vers chaque client du `Set`.
- `addClient(res)` / `removeClient(res)` : gestion du `Set` + nettoyage.
- Heartbeat : `setInterval` émettant `{type:'ping'}` toutes les ~25 s vers tous les clients pour garder la connexion ouverte à travers les proxys idle.

### Routes modifiées (`src/routes/userRoutes.js`)
- **Nouvelle** `GET /api/chat/stream` (publique en lecture, authentifiée recommandée) :
  - Headers : `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
  - Envoi de l'état initial : historique (`getRecentMessages()`) + présence courante, en un ou plusieurs événements.
  - `realtimeService.addClient(res)` ; `req.on('close', () => realtimeService.removeClient(res))`.
  - Enregistre l'identité dans la `Map` de présence à la connexion, émet un événement `presence`.
- `POST /api/chat/send` : après `chatService.sendMessage()`, `realtimeService.broadcast({type:'message', message})`.
- `POST /api/chat/react` : après `addReaction`/`removeReaction`, `realtimeService.broadcast({type:'reaction', messageId, reactions})` (remplace le refetch forcé côté client).

### Client (`src/views/partials/chat.ejs`)
- Remplace `setInterval(fetchMessages, 4000)` par `const es = new EventSource('/api/chat/stream')`.
- `es.onmessage` parse l'événement et met à jour l'UI selon `type` (`message`, `reaction`, `presence`, `typing`, `ping`).
- Au chargement : un `fetchMessages()` initial pour l'historique, puis le flux SSE prend le relais (l'état initial SSE est également diffusé, à dédupliquer via `lastMessageId`).

### Principe de conception
Le `EventEmitter` central découple producteurs (routes) et consommateurs (flux SSE) : chaque route ne fait qu'`emit()`/`broadcast()`, sans connaître les clients. L'interface reste identique si on migre plus tard vers Redis pub/sub (multi-instance).

## Section 2 — Typing, Présence, Notifications

Tous utilisent le même bus SSE avec des `type` d'événements distincts. Tout est **éphémère / in-memory** (aucune persistance DB).

### Présence (« N en ligne »)
- À la connexion SSE, le client transmet son identité ; le serveur l'ajoute à la `Map` de présence et diffuse `{type:'presence', online:[usernames], count:N}`.
- À la déconnexion (`req.on('close')`), retrait de la `Map` + nouvelle diffusion `presence`.
- Le header du widget affiche le compte dynamique au lieu de « En ligne » statique.

### Typing indicator (« Username écrit… »)
- Le client émet `POST /api/chat/typing` (throttlé ~1.5 s côté client) pendant la saisie.
- Le serveur `broadcast({type:'typing', userId, username})` vers les **autres** clients.
- Côté client recevant : affichage « Username écrit… » avec timeout auto de 3 s (disparaît si pas de nouvelle frappe).

### Notifications (badge + son)
- Quand un `message` arrive et que le chat est fermé : afficher `chatBadge` (déjà existant) + jouer un son court via un élément `<audio>` léger.
- Déblocage du contexte audio au premier clic utilisateur (politiques autoplay navigateur).
- Si le chat est ouvert : ajout du message + scroll (comportement actuel).

## Section 3 — Erreurs, robustesse, tests, impact

### Robustesse
- `es.onerror` → reconnexion automatique (natif). Fallback : après 5 échecs consécutifs, repli temporaire sur `fetchMessages` périodique (dégradation gracieuse).
- Heartbeat `ping` 25 s (cf. Section 1).
- Nettoyage strict des clients à la déconnexion (évite fuites mémoire sur serveur persistant long-lived).
- Garde-fou : borne max sur la taille du `Set` de clients si nécessaire.

### Impact sur le code existant (minimal & ciblé)
- `src/services/realtimeService.js` — **nouveau**.
- `src/routes/userRoutes.js` — **modifié** : +`GET /stream`, +`POST /typing`, +`broadcast()` dans `/send` et `/react`.
- `src/views/partials/chat.ejs` — **modifié** : EventSource, UI typing/présence/son.
- `src/services/chatService.js` — **inchangé** (logique DB intacte, on émet après insert).
- `src/config/dbInit.js` et schéma messages — **inchangés** (aucune nouvelle table).

### Tests
- **Unitaires** (`realtimeService`) : émettre un événement déclenche les bons listeners ; la `Map` présence ajoute/retire correctement les clients ; `broadcast` écrit vers tous les clients du `Set`.
- **Intégration** : ouvrir un flux SSE, poster via `/send`, vérifier réception de `type:'message'` ; tester reconnexion/heartbeat.
- Respect de la **Zero Mock Policy** : pas de données fictives, DB de test réelle.

## Critères de succès
- Latence d'apparition d'un message : < 500 ms (vs 0–4 s avant).
- Plus aucune requête GET `/messages` répétitive en continu (remplacée par 1 flux SSE).
- Typing, présence, notifications fonctionnels et visibles dans le widget.
- En cas de coupure SSE, le chat reste utilisable (fallback polling).
