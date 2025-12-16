# Agence de location

Application web légère pour gérer le parc de véhicules, les clients, les réservations et les tâches d'une agence de location. Construite avec Flask et SQLite.

## Installation

```bash
./install.sh
```

L'installation crée un environnement virtuel `.venv`, installe les dépendances et initialise la base SQLite `rental_agency.db`.

## Lancement

Activez l'environnement, puis démarrez le serveur :

```bash
source .venv/bin/activate
flask --app app.py run --debug
```

L'application est accessible sur [http://localhost:5000](http://localhost:5000).

## Fonctionnalités

- **Parc** : ajout et visualisation des véhicules avec statut et tarif journalier.
- **Clients** : enregistrement des clients avec coordonnées.
- **Réservations** : création de réservations liées à un client et un véhicule avec statut et dates.
- **Tâches** : suivi des tâches internes (maintenance, nettoyage, administratif) avec échéance et validation.
