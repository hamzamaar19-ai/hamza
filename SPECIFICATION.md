# Spécification fonctionnelle et technique – Gestion d'agence de location de voitures

## 1) Vision & périmètre
### Objectifs (3 à 6)
- Centraliser toutes les réservations, contrats, paiements et documents pour réduire les erreurs et les pertes d'information.
- Optimiser l'utilisation de la flotte via un planning en temps réel (disponibilité, maintenance, livraisons) et éviter le surbooking.
- Accélérer l'onboarding client et la génération de documents légaux (contrat, état des lieux, facture) avec des modèles multilingues.
- Sécuriser les opérations (rôles, permissions, audit log) et tracer l'historique complet clients/réservations/paiements/dommages.
- Automatiser les notifications (email/WhatsApp) pour confirmations, rappels, relances, incidents et reporting.

### Hors périmètre
- Paiement en ligne (V2), KYC automatisé par API gouvernementale, gestion fine RH/paie des chauffeurs, gestion carburant par carte fuel, application mobile native.

### MVP vs V1 vs V2
- **MVP** : Réservations internes + formulaire public, planning disponibilité, fiche véhicule, fiche client, contrats PDF, états des lieux (photo/upload), paiements & dépôts basiques, notifications email/WhatsApp templates simples, rôles de base, audit log minimal, reporting basique CA & occupation.
- **V1** : Toutes options décrites (tarifs saisonniers/promos, annulation/modification/prolongation, déductions dépôt, maintenance planifiée, dommages, livraison chauffeur avec ordres de mission, multi-langue FR/EN/AR, templates PDF paramétrables, journal caisse/export comptable, blacklist), filtres avancés et recherche globale, modèles messages multi-langue, synchronisation Google Calendar optionnelle.
- **V2** : Paiement en ligne, signature tactile avancée, géolocalisation chauffeur, API partenaires OTA, module fidélité, application mobile, traduction ES/PL, analytics prédictifs.

## 2) Rôles utilisateurs & permissions
Pour tous : login sécurisé, 2FA optionnel, journal d'audit. CRUD = créer/lire/mettre à jour/supprimer.

- **Admin** : CRUD complet sur utilisateurs, rôles, paramètres (taxes, lieux, modèles, tarifs), véhicules, réservations, paiements, documents, notifications. Peut annuler/forcer, voir reporting complet, exporter données. Actions interdites : aucune (sauf suppression définitive des logs/audit).
- **Agent réservation** : CRUD sur réservations, clients, options, génération contrats, états des lieux, vouchers, factures. Peut encaisser paiements (selon paramètre). Ne peut pas supprimer véhicules, paramètres globaux, utilisateurs.
- **Responsable parc (fleet)** : Lire réservations, modifier affectation véhicule, changer statut flotte, gérer maintenance/dommages, photos/documents voiture. Ne peut pas encaisser, ni modifier tarifs globaux, ni supprimer réservations.
- **Chauffeur/Livreur** : Accès mobile restreint : voir missions, confirmer pickup/dropoff, checklists, photos, signatures client. Peut signaler incident. Pas d'accès à tarifs, reporting, paramètres.
- **Comptable** : Lire réservations, paiements, dépôts, déductions ; valider remboursements, exporter journal caisse/comptable. Ne peut pas modifier véhicules ni planning, accès en lecture aux contrats.
- **Support/Call center** : Créer/modifier réservations, saisir notes, déclencher notifications. Lecture clients/véhicules. Pas d'accès aux paiements/dépôts ni paramètres.

## 3) Architecture du site (plan de navigation)
- **Tableau de bord** : KPIs (réservations du jour, retards, véhicules indisponibles, encaissements). Actions rapides : nouvelle réservation, ajouter paiement, créer mission livraison.
- **Réservations**
  - Liste + filtres, calendrier (jour/semaine/mois), création/modification, actions (confirmer, assigner véhicule, annuler, prolonger, générer contrat, état des lieux, facture, voucher).
- **Clients (CRM)** : liste, fiche client, documents, notes, historique, blacklist.
- **Parc voitures**
  - Flotte : liste, fiche véhicule (documents, photos), statuts.
  - Maintenance & tâches : planification, rappels, immobilisation.
  - Dommages/Incidents : déclarations, devis, suivi.
- **Livraisons/Chauffeurs** : planning missions, ordres, suivi.
- **Documents** : modèles, contrats générés, états des lieux, factures, reçus, vouchers.
- **Paiements & Caisse** : encaissements, dépôts, restitutions, déductions, export.
- **Reporting** : CA, occupation, revenus par véhicule, retards, sinistres, maintenance, top clients/sources.
- **Paramètres** : utilisateurs & rôles, tarifs & saisons, lieux & frais, options, taxes, notifications, PDF templates, langues.

Pour chaque page :
- **Liste Réservations** : cible Agent/Admin/Support. Actions : créer, filtrer, éditer, changer statut, générer documents, envoyer notifications.
- **Calendrier** : cible Agent/Admin/Responsable parc. Actions : drag/drop affectation véhicule, bloque dates maintenance, voir conflits.
- **Fiche Réservation** : détails client, véhicule, options, paiements, documents, timeline. Actions : confirmer, annuler, prolonger, état des lieux, contrat, facture.
- **Liste Clients** : cible Agent/Support/Admin. Actions : créer, filtrer, uploader docs, notes, blacklist.
- **Fiche Véhicule** : cible Parc/Admin. Actions : changer statut, ajouter doc/photo, planifier maintenance, lier réservations.
- **Maintenance** : cible Parc/Admin. Actions : créer tâche, marquer fait, immobiliser véhicule, coûts.
- **Dommages** : cible Parc/Admin/Comptable. Actions : déclarer, lier réservation/inspection, devis, facturation.
- **Livraisons** : cible Chauffeur/Admin. Actions : assigner mission, checklist, validation photo/signature.
- **Paiements/Caisse** : cible Comptable/Admin/Agent. Actions : encaisser, remboursement, restituer dépôt, déduction, export.
- **Reporting** : cible Admin/Comptable. Actions : filtres, export Excel/PDF.
- **Paramètres** : cible Admin. Actions : CRUD paramètres.

## 4) Modules (très détaillés)
### A) Réservations
- **Description** : Gestion complète réservation du devis à la clôture, depuis back-office ou formulaire public.
- **Règles métier** :
  - Statuts : draft → pending → confirmed → delivered (véhicule remis) → in_rental → returned → closed ; transitions annulées : cancelled, no_show. Overbooking interdit si véhicule non disponible ; possibilité d'autorisation Admin pour surbooking avec alerte.
  - Disponibilité temps réel basée sur plages de dates + statut véhicule (maintenance/immobilisé indispo).
  - Tarifs : base/jour selon saison + catégorie + promotions + remises manuelles % ou montant ; total recalculé après modification dates/options.
  - Livraison/reprise : lieux prédéfinis (aéroport, hôtel, ville, hors-ville avec supplément), horaires obligatoires, frais selon zone/plage horaire.
  - Options : siège bébé (1 gratuit, 2e payant), 2e conducteur, assurance complète, porte-surf, nettoyage (obligatoire selon politique), GPS, livraison hors-ville.
  - Annulation : frais selon règle (ex : <24h = 1 jour de location) ; No-show marque réservation fermée mais véhicule libéré.
  - Prolongation : recalcul tarif + vérifier disponibilité véhicule ; si non disponible, proposer véhicule de remplacement.
  - Overbooking : besoin validation Admin ; marquage conflict flag.
- **Champs principaux** (obligatoire O)
  - Client (select/existant ou nouveau) O
  - Dates/Heures départ-retour O (validation retour > départ)
  - Lieu départ/retour (select) O
  - Véhicule (select auto-dispo) O
  - Tarif journalier calculé (num, readonly), nb jours (int), promo/remise (num), total HT/TTC (num)
  - Options (checkbox/quantité) : siège bébé qty, 2e conducteur bool, assurance bool, nettoyage enum (obligatoire/optionnel), GPS bool, porte-surf bool, livraison hors-ville bool
  - Dépôt requis (num), type dépôt (cash/carte/virement/aucun)
  - Statut paiement (non payé/partiel/payé)
  - Source (web/téléphone/agence/partenaire)
  - Notes internes (text)
- **Workflows**
  1. Création (back-office ou formulaire public) → validation disponibilité → calcul tarif → sauvegarde draft/pending.
  2. Confirmation (paiement dépôt optionnel) → contrat généré → assigner véhicule.
  3. Livraison/pickup → état des lieux départ (photos, km, carburant, dégâts) → statut delivered/in_rental.
  4. Retour → état des lieux retour → calcul déductions → facture finale → clôture.
  5. Modif/Prolongation → recalcul tarifs + vérif disponibilité.
  6. Annulation/No-show → appliquer frais + libérer véhicule.
- **États & statuts** : draft, pending, confirmed, delivered, in_rental, returned, closed, cancelled, no_show, conflict_overbook.
- **Notifications** :
  - Confirmation (email/WhatsApp) client + interne.
  - Rappel 24h avant départ, 2h avant retour.
  - Changement de lieu/heure → notification chauffeur.
  - Annulation/no-show → notification comptable (pour dépôt) + parc (libération véhicule).
- **Exemples**
  - Réservation web pour 5 jours, option siège bébé 2 (2e payant), livraison aéroport : total = (tarif saison x5) + option supplémentaire + frais aéroport ; dépôt requis 300€.
  - Prolongation de 1 jour : vérif dispo, ajoute 1 jour tarif (haute saison) + recalc assurance.

### B) Clients (CRM)
- **Description** : Fiches clients avec documents, historique, notes et alertes.
- **Règles** : Un client peut être blacklisté (motif). Documents (permis/passeport) obligatoires pour contrat. Déduplication par email/téléphone.
- **Champs** : nom O, prénom, email O, téléphone O (validation regex), adresse, ville/pays, type doc, numéro doc O, expiration doc, photo doc (upload), notes internes, statut blacklist (bool + motif), source client.
- **Workflows** : création lors réservation ou via CRM ; upload documents ; ajout notes ; mise en blacklist (bloque nouvelles réservations sauf override Admin).
- **Notifications** : rappel expiration permis/passeport (option Admin).
- **Exemples** :
  - Agent ajoute client avec passeport expirant dans 1 mois → alerte "document expire bientôt".
  - Client blacklisté pour impayé → nouvelle réservation refuse sauf Admin.

### C) Parc voitures (Fleet)
- **Description** : Gestion fiches véhicules, statuts et documents légaux.
- **Règles** : Un véhicule ne peut être assigné que si statut disponible. Maintenance/accident rend indisponible. Suivi km et carburant lors inspections.
- **Champs** : marque O, modèle O, année, immatriculation O (unique), catégorie (citadine/SUV/etc.), km actuel O, carburant %, statut (disponible/réservé/en livraison/en location/maintenance/accident), caution standard, couleur, transmission, sièges, photos, carte grise (upload), assurance (date fin), CT (date), pneus (date/changement), notes.
- **Workflows** : création fiche ; changement statut via réservation ou maintenance ; rappels échéances (assurance/CT/pneus/vidange).
- **Notifications** : rappel 30/7/1 jours avant échéance ; alerte immobilisation.
- **Exemples** :
  - Véhicule en maintenance jusqu'au 15/08 → indispo calendrier ; tentative réservation génère conflit.
  - Assurance expire dans 10 jours → email Responsable parc.

### D) Contrats & documents
- **Description** : Génération de contrats PDF multilingues, numérotation automatique, signatures.
- **Règles** : numéro contrat/état des lieux/facture séquentiel par année. Contrat verrouillé après signature. État des lieux obligatoire pour clôture.
- **Champs** : modèle contrat (langue), clauses, infos client/véhicule/tarifs, signatures (texte ou tactile), checklist départ/retour (carburant %, km, propreté, dégâts). Photos horodatées.
- **Workflows** : depuis réservation confirmée → générer contrat PDF → signature → état des lieux départ → état des lieux retour → facture PDF → reçu/voucher.
- **Notifications** : envoi contrat PDF au client après signature ; envoi facture à clôture.
- **Exemples** :
  - Contrat FR généré avec signature tactile sur mobile ; photos intégrées dans PDF état des lieux.
  - Facture auto-numérotée incluant déductions nettoyage + carburant manquant.

### E) Paiements & dépôts
- **Description** : Encaissement multi-moyens, suivi dépôts, déductions et restitutions.
- **Règles** : dépôt peut être pris en cash/carte/virement ; restitution totale/partielle avec motif. Déductions possibles (nettoyage, carburant, dégâts, retard). Journal caisse par jour/utilisateur. Conversion devise optionnelle.
- **Champs** : montant, devise, moyen (cash/carte/virement), référence, type (acompte/soldes/dépôt/déduction/remboursement), statut (initié/reçu/remboursé), utilisateur caisse, note.
- **Workflows** : encaissement acompte → solde au départ ou retour ; prise dépôt → restitution ou retenue partielle → reçu ; export journal.
- **Notifications** : reçu paiement au client ; alerte comptable pour restitution due.
- **Exemples** :
  - Dépôt 300€ pris en cash ; au retour retenue 50€ pour nettoyage, restitution 250€ avec reçu.
  - Paiement partiel 30% en virement confirmé avant livraison, solde en cash à l'aéroport.

### F) Dommages & incidents
- **Description** : Gestion des sinistres liés à une réservation ou véhicule.
- **Règles** : lien obligatoire avec état des lieux ou déclaration chauffeur ; statuts : ouvert → en cours (devis/assurance) → clos. Franchise appliquée selon contrat. Peut générer facture client.
- **Champs** : véhicule O, réservation liée, description O, photos, date, lieu, responsabilité (client/agence/tiers), devis montant, franchise, assurance dossier, statut, facturation associée.
- **Workflows** : déclaration → ajout photos/devis → validation responsabilité → facturation déduction dépôt ou facture → clôture.
- **Notifications** : alerte Responsable parc + Comptable ; rappel si non clôturé sous 7 jours.
- **Exemples** :
  - Griffe pare-choc détectée au retour → devis 150€ → retenue dépôt 150€ → statut clos.
  - Accident majeur avec assurance → dossier en cours, véhicule immobilisé, facture assurance.

### G) Maintenance & tâches
- **Description** : Suivi préventif et curatif, coûts et immobilisation.
- **Règles** : tâches planifiées par km ou date ; immobilisation bloque disponibilité. Statuts tâche : planifiée → en cours → faite → annulée.
- **Champs** : véhicule O, type maintenance (vidange/pneu/CT/assurance/autre), déclencheur (date/km), coût estimé/réel, fournisseur, documents facture, immobilisation dates, note.
- **Workflows** : créer rappel → notification avant échéance → exécution → mise à jour km et documents → clôture.
- **Notifications** : rappel 30/7/1 jours ou à km seuil ; alerte si retardée.
- **Exemples** :
  - Vidange prévue à 60 000 km ; à 59 500 km, rappel envoyé ; immobilisation 1 jour programmée.
  - CT expiré → véhicule automatiquement indisponible jusqu'à mise à jour doc.

### H) Livraisons / Chauffeurs
- **Description** : Gestion missions de livraison/reprise, checklists et preuves.
- **Règles** : chaque mission liée à réservation ; statut mission : assignée → en route → effectuée → échouée. Checklists obligatoires (photos, signature client).
- **Champs** : réservation, chauffeur O, type (pickup/dropoff), lieu, heure prévue, frais, véhicule, checklists (documents, propreté), commentaires, géolocalisation optionnelle.
- **Workflows** : création mission depuis réservation → assignation chauffeur → notifications → exécution (mobile) → validation photo/signature → statut effectué.
- **Notifications** : chauffeur reçoit mission ; client reçoit rappel livraison ; admin reçoit alerte si retard.
- **Exemples** :
  - Mission dropoff à l'aéroport 10h : chauffeur check photo véhicule + signature client ; statut effectué.
  - Mission pickup hôtel échouée (client absent) → statut échoué, réservation marquée no-show.

### I) Utilisateurs & paramètres
- **Description** : Gestion comptes, rôles, paramètres opérationnels et templates.
- **Règles** : rôles avec permissions granulaires (page/action). Paramètres versionnés. Templates multi-langue pour messages et PDF.
- **Champs** : utilisateur (nom, email O, téléphone, rôle O, langue, actif), paramètres (taxes %, lieux/frais, horaires agence, devises, options prix, politiques annulation, modèles messages, logos, couleurs PDF).
- **Workflows** : créer utilisateur → invitation email ; modifier rôle ; mettre à jour paramètre avec historique ; activer/désactiver options.
- **Notifications** : mail d'invitation ; alertes si rôle changé.
- **Exemples** :
  - Ajout Support bilingue EN/AR ; interface bascule langue.
  - Mise à jour frais livraison hors-ville +10% ; appliqué sur nouvelles réservations seulement.

### J) Reporting
- **Description** : Tableaux et exports KPI financiers et opérationnels.
- **Règles** : filtres par période, source, véhicule, agent. Données basées sur réservations clôturées pour CA, ou confirmed+ pour occupation. Exports Excel/PDF.
- **Champs/KPIs** : CA total/HT/TTC, occupation (%) = jours loués/jours dispos, revenu par véhicule, retards, sinistres, coûts maintenance, top clients, sources réservation, paiements en retard.
- **Workflows** : sélectionner période/filtres → affichage graphiques/cartes → export.
- **Notifications** : rapports hebdo/mensuels email/WhatsApp.
- **Exemples** :
  - Rapport mensuel : CA 50k€, occupation 78%, 3 sinistres (500€), maintenance 1.2k€.
  - Top clients corporate génèrent 30% du CA → décision de remise spéciale.

## 5) Base de données (proposition)
- **Tables principales** : users, roles, permissions, role_permissions, clients, reservations, reservation_options, vehicles, vehicle_status_logs, inspections (états des lieux), contracts, invoices, receipts, payments, deposits, damages, maintenance_tasks, tasks_documents, chauffeurs (ou users avec rôle), missions (livraisons), locations (lieux), addons (options), pricing_rules (saisons/promos), notification_templates, notifications_log, audit_log, documents, pricing_seasons, sources, blacklists, calendars_blocks.
- **Relations** :
  - users 1-n reservations (created_by), n-n roles via role_permissions.
  - clients 1-n reservations.
  - vehicles 1-n reservations, 1-n maintenance_tasks, 1-n inspections, 1-n damages, 1-n status_logs.
  - reservations 1-n payments/deposits/inspections/contracts/invoices/receipts/missions/reservation_options.
  - addons n-n reservations (quantité via reservation_options).
  - notification_templates 1-n notifications_log.
  - locations référencées par reservations/missions.
- **Index recommandés** :
  - reservations (start_at, end_at, status, vehicle_id),
  - vehicles (status, category, plate unique),
  - clients (email unique, phone),
  - payments (reservation_id, created_at),
  - maintenance_tasks (due_date, vehicle_id),
  - notifications_log (reservation_id, client_id),
  - audit_log (entity_type, entity_id, created_at).

## 6) UX/UI (très concret)
- **Wireframes texte**
  - Tableau de bord : header avec recherche globale ; cartes KPI ; liste "Aujourd'hui" (départs/retours) ; colonne droite notifications ; CTA primaire "Nouvelle réservation".
  - Liste Réservations : barre filtres (date range, statut, véhicule, lieu, source, agent) + recherche ; tableau avec colonnes client, dates, véhicule, statut, paiement ; actions inline (contrat, facture, message, annuler).
  - Calendrier : vue planning avec lignes véhicules, colonnes jours ; blocs réservations colorés par statut ; drag/drop pour affecter véhicule ; overlay détail.
  - Fiche Réservation : onglets (Résumé, Paiements, Documents, Timeline, Notes). Bloc haut : client + véhicule + dates + statut. Panneau droite : actions (confirmer, prolonger, annuler, envoyer). Section options + frais livraison. Section paiements avec boutons encaisser/rembourser.
  - Fiche Véhicule : header info (photo, plaque, statut). Onglets (Détails, Documents, Maintenance, Historique réservations, Dommages). Badge alerte si échéance proche.
  - Mobile chauffeur : liste missions, détail mission avec checklist, boutons Photo, Signature, Statut.
- **Raccourcis** : bouton + flottant pour créer réservation/paiement/mission ; double-clic calendrier pour nouvelle résa ; scanner permis (upload) rapide.
- **Recherche globale** : par nom client, téléphone, immat, numéro réservation/contrat/facture ; résultats en autocomplete.
- **Filtres essentiels** : statuts, dates, lieu, véhicule, source, agent, catégorie voiture, blacklist, paiements en retard.
- **États vides** : messages guidants + CTA (ex : "Aucune réservation ce jour - Créer une réservation").
- **Erreurs** : validations claires (ex : "Retour doit être après départ"), toasts pour actions rapides, modales de confirmation pour annulation/no-show/surbooking.

## 7) Sécurité & conformité
- Authentification avec 2FA option, sessions expirables ; mots de passe hashés. Rate limiting sur login.
- Rôles & permissions granulaires, vérifiés backend & frontend ; séparation des environnements.
- Logs/audit : action, utilisateur, timestamp, IP, entité avant/après (diff). Inaltérables.
- Sauvegardes régulières base + documents (chiffrés at-rest et en transit). Versioning documents critiques.
- RGPD-like : consentement pour communications, suppression/anonymisation sur demande, durée conservation docs (permis/passeport) configurable, restriction accès photos/dégâts.
- PDF légaux : numérotation séquentielle, horodatage, tamper-proof (hash), watermark option.

## 8) APIs & intégrations (optionnelles)
- **WhatsApp** : templates pour confirmation, rappel, annulation, facture ; variables (nom, dates, lieu, montant). Webhook statut.
- **Email SMTP** : envoi via SMTP configurable, DKIM/SPF recommandés.
- **Paiement en ligne (V2)** : intégration Stripe/Moroccan PSP ; webhook paiement ; auto-update statut réservation.
- **Google Calendar** : sync réservations confirmées par véhicule ou par agent ; dédoublonnage.
- **Export** : PDF/Excel pour reporting, journal caisse, liste réservations.

## 9) Checklist de développement
### User stories (>=25)
1. En tant qu'agent, je veux créer une réservation back-office pour confirmer un client au téléphone.
2. En tant que client, je veux réserver via un formulaire public avec choix lieu/horaire.
3. En tant qu'agent, je veux voir un calendrier par véhicule pour éviter les conflits.
4. En tant qu'agent, je veux appliquer une remise manuelle pour un client fidèle.
5. En tant qu'agent, je veux prolonger une réservation en vérifiant la disponibilité.
6. En tant qu'agent, je veux annuler une réservation avec calcul des frais.
7. En tant qu'admin, je veux autoriser un surbooking exceptionnel.
8. En tant qu'admin, je veux gérer les options (prix, gratuités) pour qu'elles se répercutent.
9. En tant que client, je veux recevoir une confirmation et un rappel avant le départ.
10. En tant qu'agent, je veux générer un contrat PDF en FR/EN/AR.
11. En tant qu'agent, je veux saisir un état des lieux départ/retour avec photos.
12. En tant qu'agent, je veux encaisser un acompte et voir le solde restant.
13. En tant que comptable, je veux restituer partiellement un dépôt avec justificatif.
14. En tant que responsable parc, je veux immobiliser un véhicule pour maintenance.
15. En tant que responsable parc, je veux recevoir des rappels d'assurance/CT.
16. En tant que responsable parc, je veux déclarer un dommage et suivre le devis.
17. En tant que chauffeur, je veux recevoir mes missions avec lieu/heure et valider livraison.
18. En tant que chauffeur, je veux prendre des photos et collecter la signature client.
19. En tant que support, je veux rechercher rapidement un client par téléphone.
20. En tant qu'admin, je veux configurer les frais de livraison hors-ville.
21. En tant qu'admin, je veux gérer les rôles et permissions des utilisateurs.
22. En tant qu'admin, je veux voir un audit log des actions critiques.
23. En tant que manager, je veux un reporting CA et occupation par période.
24. En tant que manager, je veux exporter le journal caisse pour la comptabilité.
25. En tant que agent, je veux marquer un no-show et libérer le véhicule.
26. En tant que agent, je veux ajouter un deuxième conducteur à une réservation.
27. En tant que admin, je veux blacklist un client pour fraude et bloquer ses réservations.
28. En tant que agent, je veux envoyer un voucher au client après confirmation.
29. En tant que agent, je veux noter la source de réservation pour le reporting.
30. En tant que agent, je veux appliquer des frais de nettoyage si véhicule rendu sale.

### Critères d'acceptation (10 fonctionnalités critiques)
1. **Création réservation** : Given formulaire rempli avec client, dates, véhicule dispo; When je sauvegarde; Then la réservation passe en pending, le total est calculé et visible, et aucune autre réservation sur ce véhicule n'est en conflit.
2. **Confirmation** : Given réservation pending; When je clique Confirmer; Then statut devient confirmed, un contrat PDF est généré et le client reçoit email/WhatsApp.
3. **Calendrier** : Given vue calendrier; When je glisse une réservation vers un autre véhicule; Then le système vérifie la dispo et met à jour l'affectation si pas de conflit, sinon affiche alerte.
4. **Prolongation** : Given réservation in_rental; When j'ajoute 1 jour; Then dispo véhicule est vérifiée, le total est recalculé et un avenant contrat est généré.
5. **Annulation** : Given réservation confirmed; When j'annule à moins de 24h; Then frais d'annulation = 1 jour tarif appliqué et le véhicule redevient disponible.
6. **État des lieux** : Given réservation delivered; When je complète l'état des lieux retour avec photos; Then le kilométrage et carburant sont enregistrés et disponibles pour facturation.
7. **Paiement & dépôt** : Given dépôt encaissé; When je restitue partiellement avec motif; Then un reçu PDF est généré et le solde du dépôt est mis à jour.
8. **Dommage** : Given dommage ouvert lié à réservation; When je renseigne un devis et franchise; Then le système propose une déduction du dépôt ou facture au client.
9. **Maintenance** : Given tâche vidange due; When la date est atteinte; Then véhicule passe en maintenance (indisponible) et le responsable reçoit une notification.
10. **Audit log** : Given action critique (annulation, paiement, modification tarif); When elle est réalisée; Then un log est créé avec utilisateur, IP, timestamp et valeurs avant/après.

### Priorités (P0/P1/P2)
- **P0 (MVP)** : Réservations (CRUD, calendrier, options, tarification simple), Clients, Flotte (statuts), Contrats/états des lieux, Paiements & dépôts basiques, Notifications email/WhatsApp, Rôles & audit minimal, Reporting CA/occupation basique.
- **P1 (V1)** : Tarifs saison/promo, annulation/modif/prolongation avancées, surbooking avec override, maintenance planifiée, dommages, livraison chauffeur, blacklist, journal caisse/export, multi-langue complet, templates PDF/message paramétrables, Google Calendar sync.
- **P2 (V2)** : Paiement en ligne, signature tactile avancée, géolocalisation, API OTA, fidélité, app mobile, traductions ES/PL, analytics prédictifs.
