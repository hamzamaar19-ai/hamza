#!/usr/bin/env bash
set -euo pipefail

echo "Création de l'environnement virtuel .venv"
python3 -m venv .venv
source .venv/bin/activate

echo "Installation des dépendances"
pip install --upgrade pip
pip install -r requirements.txt

echo "Initialisation de la base de données"
FLASK_APP=app.py flask --app app.py shell <<'PY'
from app import db

db.create_all()
print("Base de données initialisée.")
PY

echo "Installation terminée. Lancez 'source .venv/bin/activate' puis 'flask run'."
