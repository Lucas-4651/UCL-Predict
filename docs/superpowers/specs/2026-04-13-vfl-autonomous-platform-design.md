# Design Spec: Plateforme SaaS UCL Autonome

## 📅 Date: 2026-04-13
## 🎯 Objectif
Construire une plateforme de prédiction de football virtuel (UCL) ultra-légère, auto-apprenante, auto-réparatrice et anti-dérive, optimisée pour Termux et VPS (2GB RAM).

---

## 🏗️ 1. Architecture Globale
Le système adopte une approche hybride pour maximiser la réactivité utilisateur et l'autonomie du moteur.

### Flux de Données
- **Interface Utilisateur (Frontend EJS)** : Accès à la demande. Le bouton "Rafraîchir" déclenche la récupération des matchs et la génération de prédictions instantanées.
- **Backend (Node.js)** :
    - **L'Ingestion** : Appels API Sporty Tech via mimétisme de client.
    - **Le Moteur d'Intelligence** : Calcule les probabilités via des facteurs pondérés.
    - **La Boucle d'Apprentissage (Background)** : Job périodique qui vérifie les résultats des matchs et ajuste les poids des facteurs.
    - **Le Moniteur de Drift** : Analyse la précision glissante et déclenche le recalibrage.
    - **L'Orchestrateur de Santé (Self-Healing)** : Surveille les services et répare les pannes (API, DB, RAM).

---

## 🧠 2. Moteur de Prédiction & Self-Learning

### Logique de Prédiction (Heuristique)
Le système utilise un score de probabilité basé sur des facteurs pondérés :
$\text{Score} = \sum (\text{Facteur}_i \times \text{Poids}_i)$

**Facteurs exploités :**
- **Ranking Delta** : Différence de points et position.
- **Forme Récente** : Performance sur les $N$ derniers matchs.
- **Cotes Implicites** : Probabilité dérivée des cotes du bookmaker.
- **Biais Terrain** : Avantage domicile/extérieur.

### Boucle d'Apprentissage
1. **Comparaison** : $\text{Prédiction} \leftrightarrow \text{Résultat Réel}$.
2. **Analyse d'Erreur** : Identification du facteur le plus divergent.
3. **Ajustement** : $W_{\text{nouveau}} = W_{\text{ancien}} + (\text{Erreur} \times \text{LearningRate})$.
4. **Persistance** : Mise à jour des poids dans la table `weights`.

---

## 📉 3. Système Anti-Drift

### Détection
Surveillance continue via :
- **Rolling Accuracy** : Comparaison de la précision (10 matches vs 200 matches).
- **Confidence Mismatch** : Taux d'échec sur les prédictions à haute confiance.
- **Entropie** : Détection d'un appauvrissement des prédictions (trop de résultats moyens).

### Recalibrage
Si un drift est détecté $\rightarrow$ Déclenchement du `RecalibrationEngine` :
- Réduction drastique des poids des facteurs instables.
- Boost des facteurs stables.
- Reset partiel des biais.
- Augmentation temporaire du Learning Rate pour une adaptation rapide.

---

## 🛠️ 4. Couche Auto-Réparatrice (Self-Healing)

### Services de Récupération
- **API Recovery** : Exponential Backoff et Stale Cache Fallback.
- **DB Recovery** : Mode WAL (SQLite) et file d'attente d'écriture pour éviter les locks.
- **Memory Recovery** : Purge automatique des logs/cache et passage en "Adaptive Slow Mode".
- **Prediction Sanity** : Filtrage des scores impossibles et régénération automatique.

### Machine d'État de Santé
- `HEALTHY` $\rightarrow$ `DEGRADED` $\rightarrow$ `RECOVERING` $\rightarrow$ `RECALIBRATING` $\rightarrow$ `CRITICAL`.

---

## 🌐 5. Couche SaaS & Utilisateurs

### Interface
- **Frontend** : EJS, Responsive, optimisé mobile.
- **Public** : Liste des matchs, Pronostics, Indice de Confiance, Bouton Rafraîchir.
- **Auth** : JWT, Multi-utilisateurs, Accès Gratuit.

### Dashboard Administrateur
- **Observabilité** : Précision live, Alertes de Drift, État de santé.
- **Monitoring** : RAM, Latence DB, Latence API.
- **Contrôle** : Forçage de recalibrage, Purge cache.

---

## 🗄️ 6. Schéma de Base de Données

### Tables Principales
- `users` : `id, username, password_hash, role, created_at`
- `matches` : `id, api_id, teams, score, status, timestamp`
- `predictions` : `id, match_id, outcome, confidence, weights_snapshot, is_correct`
- `weights` : `factor_name, weight_value, last_updated`
- `drift_metrics` : `id, timestamp, rolling_accuracy, entropy, status`
- `healing_logs` : `id, timestamp, service, event, action_taken, result`
- `health_snapshots` : `id, timestamp, state, ram_usage, db_latency`
- `recalibration_history` : `id, timestamp, old_weights, new_weights, reason`
