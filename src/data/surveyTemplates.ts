export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'market' | 'satisfaction' | 'census' | 'agriculture' | 'health' | 'education' | 'commerce' | 'finance' | 'other';
  icon: string;
  fields: {
    field_type: string;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: { value: string; label: string }[];
    min_value?: number;
    max_value?: number;
  }[];
  isUserCreated?: boolean;
  createdBy?: string;
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  // === ÉTUDES DE MARCHÉ ===
  {
    id: 'market-study',
    name: 'Étude de marché générale',
    description: 'Analyser le marché, les concurrents et le pouvoir d\'achat',
    category: 'market',
    icon: '📊',
    fields: [
      {
        field_type: 'text',
        label: 'Nom de l\'entreprise/commerce',
        placeholder: 'Entrez le nom du commerce',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Secteur d\'activité',
        required: true,
        options: [
          { value: 'agriculture', label: 'Agriculture' },
          { value: 'commerce', label: 'Commerce de détail' },
          { value: 'services', label: 'Services' },
          { value: 'industrie', label: 'Industrie' },
          { value: 'artisanat', label: 'Artisanat' },
          { value: 'transport', label: 'Transport' },
          { value: 'restauration', label: 'Restauration' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Taille de l\'entreprise',
        required: true,
        options: [
          { value: 'micro', label: 'Micro (1-5 employés)' },
          { value: 'petite', label: 'Petite (6-20 employés)' },
          { value: 'moyenne', label: 'Moyenne (21-100 employés)' },
          { value: 'grande', label: 'Grande (100+ employés)' },
        ],
      },
      {
        field_type: 'select',
        label: 'Chiffre d\'affaires estimé (mensuel)',
        required: true,
        options: [
          { value: 'moins_500k', label: 'Moins de 500 000 FCFA' },
          { value: '500k_2m', label: '500 000 - 2 000 000 FCFA' },
          { value: '2m_5m', label: '2 000 000 - 5 000 000 FCFA' },
          { value: '5m_10m', label: '5 000 000 - 10 000 000 FCFA' },
          { value: 'plus_10m', label: 'Plus de 10 000 000 FCFA' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Principaux concurrents identifiés',
        required: false,
        options: [
          { value: 'local', label: 'Commerces locaux' },
          { value: 'national', label: 'Chaînes nationales' },
          { value: 'international', label: 'Entreprises internationales' },
          { value: 'informel', label: 'Secteur informel' },
          { value: 'aucun', label: 'Aucun concurrent direct' },
        ],
      },
      {
        field_type: 'select',
        label: 'Zone géographique couverte',
        required: true,
        options: [
          { value: 'quartier', label: 'Quartier' },
          { value: 'ville', label: 'Ville' },
          { value: 'region', label: 'Région' },
          { value: 'national', label: 'National' },
          { value: 'international', label: 'International' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Types de clients',
        required: true,
        options: [
          { value: 'particuliers', label: 'Particuliers' },
          { value: 'entreprises', label: 'Entreprises' },
          { value: 'administrations', label: 'Administrations' },
          { value: 'ong', label: 'ONG/Associations' },
        ],
      },
      {
        field_type: 'select',
        label: 'Pouvoir d\'achat de la clientèle',
        required: true,
        options: [
          { value: 'faible', label: 'Faible' },
          { value: 'moyen', label: 'Moyen' },
          { value: 'eleve', label: 'Élevé' },
          { value: 'mixte', label: 'Mixte' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo du commerce',
        required: false,
      },
      {
        field_type: 'text',
        label: 'Observations et recommandations',
        placeholder: 'Notes supplémentaires...',
        required: false,
      },
    ],
  },
  
  // === SATISFACTION CLIENT ===
  {
    id: 'customer-satisfaction',
    name: 'Satisfaction client',
    description: 'Mesurer la satisfaction et recueillir les avis',
    category: 'satisfaction',
    icon: '⭐',
    fields: [
      {
        field_type: 'text',
        label: 'Nom du client (optionnel)',
        placeholder: 'Entrez votre nom',
        required: false,
      },
      {
        field_type: 'select',
        label: 'Comment avez-vous connu notre service?',
        required: true,
        options: [
          { value: 'bouche_oreille', label: 'Bouche à oreille' },
          { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
          { value: 'publicite', label: 'Publicité' },
          { value: 'recherche', label: 'Recherche internet' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'rating',
        label: 'Qualité du produit/service',
        required: true,
        min_value: 1,
        max_value: 5,
      },
      {
        field_type: 'rating',
        label: 'Qualité de l\'accueil',
        required: true,
        min_value: 1,
        max_value: 5,
      },
      {
        field_type: 'rating',
        label: 'Rapport qualité/prix',
        required: true,
        min_value: 1,
        max_value: 5,
      },
      {
        field_type: 'rating',
        label: 'Délai de service',
        required: true,
        min_value: 1,
        max_value: 5,
      },
      {
        field_type: 'select',
        label: 'Recommanderiez-vous notre service?',
        required: true,
        options: [
          { value: 'oui_certain', label: 'Oui, certainement' },
          { value: 'probablement', label: 'Probablement' },
          { value: 'pas_sur', label: 'Pas sûr' },
          { value: 'probablement_pas', label: 'Probablement pas' },
          { value: 'non', label: 'Non' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Points à améliorer',
        required: false,
        options: [
          { value: 'qualite', label: 'Qualité des produits' },
          { value: 'prix', label: 'Prix' },
          { value: 'accueil', label: 'Accueil' },
          { value: 'delai', label: 'Délais' },
          { value: 'variete', label: 'Variété des produits' },
          { value: 'proprete', label: 'Propreté' },
          { value: 'rien', label: 'Rien à améliorer' },
        ],
      },
      {
        field_type: 'text',
        label: 'Commentaires et suggestions',
        placeholder: 'Partagez vos idées d\'amélioration...',
        required: false,
      },
      {
        field_type: 'select',
        label: 'Fréquence de visite',
        required: true,
        options: [
          { value: 'premiere', label: 'Première visite' },
          { value: 'occasionnel', label: 'Occasionnel' },
          { value: 'regulier', label: 'Régulier (1-2 fois/mois)' },
          { value: 'frequent', label: 'Fréquent (1+ fois/semaine)' },
        ],
      },
    ],
  },
  
  // === RECENSEMENT ===
  {
    id: 'census',
    name: 'Recensement population',
    description: 'Collecter des données démographiques et sociales',
    category: 'census',
    icon: '👥',
    fields: [
      {
        field_type: 'text',
        label: 'Nom du chef de ménage',
        placeholder: 'Nom complet',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Sexe',
        required: true,
        options: [
          { value: 'homme', label: 'Homme' },
          { value: 'femme', label: 'Femme' },
        ],
      },
      {
        field_type: 'number',
        label: 'Âge',
        required: true,
        min_value: 0,
        max_value: 150,
      },
      {
        field_type: 'select',
        label: 'Situation matrimoniale',
        required: true,
        options: [
          { value: 'celibataire', label: 'Célibataire' },
          { value: 'marie', label: 'Marié(e)' },
          { value: 'divorce', label: 'Divorcé(e)' },
          { value: 'veuf', label: 'Veuf/Veuve' },
          { value: 'union_libre', label: 'Union libre' },
        ],
      },
      {
        field_type: 'number',
        label: 'Nombre de personnes dans le ménage',
        required: true,
        min_value: 1,
        max_value: 50,
      },
      {
        field_type: 'number',
        label: 'Nombre d\'enfants (moins de 18 ans)',
        required: true,
        min_value: 0,
        max_value: 30,
      },
      {
        field_type: 'select',
        label: 'Niveau d\'éducation',
        required: true,
        options: [
          { value: 'aucun', label: 'Aucun' },
          { value: 'primaire', label: 'Primaire' },
          { value: 'secondaire', label: 'Secondaire' },
          { value: 'superieur', label: 'Supérieur' },
        ],
      },
      {
        field_type: 'select',
        label: 'Activité principale',
        required: true,
        options: [
          { value: 'agriculture', label: 'Agriculture' },
          { value: 'commerce', label: 'Commerce' },
          { value: 'salarie', label: 'Salarié' },
          { value: 'independant', label: 'Travailleur indépendant' },
          { value: 'sans_emploi', label: 'Sans emploi' },
          { value: 'etudiant', label: 'Étudiant' },
          { value: 'retraite', label: 'Retraité' },
        ],
      },
      {
        field_type: 'select',
        label: 'Type de logement',
        required: true,
        options: [
          { value: 'proprietaire', label: 'Propriétaire' },
          { value: 'locataire', label: 'Locataire' },
          { value: 'heberge', label: 'Hébergé' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Accès aux services',
        required: true,
        options: [
          { value: 'eau', label: 'Eau courante' },
          { value: 'electricite', label: 'Électricité' },
          { value: 'internet', label: 'Internet' },
          { value: 'sante', label: 'Centre de santé' },
          { value: 'ecole', label: 'École' },
        ],
      },
      {
        field_type: 'select',
        label: 'Revenu mensuel du ménage',
        required: false,
        options: [
          { value: 'moins_50k', label: 'Moins de 50 000 FCFA' },
          { value: '50k_150k', label: '50 000 - 150 000 FCFA' },
          { value: '150k_300k', label: '150 000 - 300 000 FCFA' },
          { value: '300k_500k', label: '300 000 - 500 000 FCFA' },
          { value: 'plus_500k', label: 'Plus de 500 000 FCFA' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo du logement',
        required: false,
      },
    ],
  },
  
  // === AGRICULTURE ===
  {
    id: 'agriculture-production',
    name: 'Production agricole',
    description: 'Évaluer la production et les besoins agricoles',
    category: 'agriculture',
    icon: '🌾',
    fields: [
      {
        field_type: 'text',
        label: 'Nom de l\'exploitant',
        placeholder: 'Nom complet',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Type d\'exploitation',
        required: true,
        options: [
          { value: 'familiale', label: 'Exploitation familiale' },
          { value: 'cooperative', label: 'Coopérative' },
          { value: 'entreprise', label: 'Entreprise agricole' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'number',
        label: 'Superficie (hectares)',
        required: true,
        min_value: 0,
        max_value: 10000,
      },
      {
        field_type: 'multiselect',
        label: 'Cultures principales',
        required: true,
        options: [
          { value: 'manioc', label: 'Manioc' },
          { value: 'mais', label: 'Maïs' },
          { value: 'banane', label: 'Banane plantain' },
          { value: 'cacao', label: 'Cacao' },
          { value: 'cafe', label: 'Café' },
          { value: 'palmier', label: 'Palmier à huile' },
          { value: 'arachide', label: 'Arachide' },
          { value: 'riz', label: 'Riz' },
          { value: 'legumes', label: 'Légumes' },
          { value: 'fruits', label: 'Fruits' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Méthode d\'irrigation',
        required: true,
        options: [
          { value: 'pluviale', label: 'Pluviale (pluie)' },
          { value: 'gravitaire', label: 'Gravitaire' },
          { value: 'goutte', label: 'Goutte-à-goutte' },
          { value: 'aspersion', label: 'Aspersion' },
          { value: 'aucune', label: 'Aucune' },
        ],
      },
      {
        field_type: 'select',
        label: 'Utilisation d\'engrais',
        required: true,
        options: [
          { value: 'chimique', label: 'Engrais chimiques' },
          { value: 'organique', label: 'Engrais organiques' },
          { value: 'mixte', label: 'Mixte' },
          { value: 'aucun', label: 'Aucun' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Difficultés rencontrées',
        required: true,
        options: [
          { value: 'eau', label: 'Accès à l\'eau' },
          { value: 'financement', label: 'Financement' },
          { value: 'semences', label: 'Qualité des semences' },
          { value: 'maladies', label: 'Maladies/parasites' },
          { value: 'transport', label: 'Transport' },
          { value: 'stockage', label: 'Stockage' },
          { value: 'vente', label: 'Débouchés commerciaux' },
          { value: 'aucune', label: 'Aucune' },
        ],
      },
      {
        field_type: 'select',
        label: 'Production vendue (%)',
        required: true,
        options: [
          { value: 'moins_25', label: 'Moins de 25%' },
          { value: '25_50', label: '25-50%' },
          { value: '50_75', label: '50-75%' },
          { value: 'plus_75', label: 'Plus de 75%' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation de l\'exploitation',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo de l\'exploitation',
        required: false,
      },
    ],
  },
  
  // === COMMERCE / DISTRIBUTION ===
  {
    id: 'retail-distribution',
    name: 'Distribution & Commerce',
    description: 'Analyser les points de vente et circuits de distribution',
    category: 'commerce',
    icon: '🏪',
    fields: [
      {
        field_type: 'text',
        label: 'Nom du point de vente',
        placeholder: 'Nom commercial',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Type de commerce',
        required: true,
        options: [
          { value: 'boutique', label: 'Boutique de quartier' },
          { value: 'supermarche', label: 'Supermarché' },
          { value: 'grossiste', label: 'Grossiste' },
          { value: 'marche', label: 'Marché' },
          { value: 'ambulant', label: 'Vendeur ambulant' },
          { value: 'kiosque', label: 'Kiosque' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Catégories de produits',
        required: true,
        options: [
          { value: 'alimentaire', label: 'Alimentaire' },
          { value: 'boissons', label: 'Boissons' },
          { value: 'hygiene', label: 'Hygiène/Cosmétiques' },
          { value: 'menager', label: 'Produits ménagers' },
          { value: 'electronique', label: 'Électronique' },
          { value: 'textile', label: 'Textile/Vêtements' },
          { value: 'quincaillerie', label: 'Quincaillerie' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Fréquence d\'approvisionnement',
        required: true,
        options: [
          { value: 'quotidien', label: 'Quotidien' },
          { value: 'hebdo', label: 'Hebdomadaire' },
          { value: 'bihebdo', label: 'Bi-hebdomadaire' },
          { value: 'mensuel', label: 'Mensuel' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Sources d\'approvisionnement',
        required: true,
        options: [
          { value: 'grossiste_local', label: 'Grossiste local' },
          { value: 'importateur', label: 'Importateur' },
          { value: 'fabricant', label: 'Fabricant direct' },
          { value: 'marche_gros', label: 'Marché de gros' },
          { value: 'cooperative', label: 'Coopérative' },
        ],
      },
      {
        field_type: 'number',
        label: 'Nombre de clients/jour',
        required: true,
        min_value: 0,
        max_value: 10000,
      },
      {
        field_type: 'select',
        label: 'Panier moyen',
        required: true,
        options: [
          { value: 'moins_1k', label: 'Moins de 1 000 FCFA' },
          { value: '1k_5k', label: '1 000 - 5 000 FCFA' },
          { value: '5k_20k', label: '5 000 - 20 000 FCFA' },
          { value: '20k_50k', label: '20 000 - 50 000 FCFA' },
          { value: 'plus_50k', label: 'Plus de 50 000 FCFA' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Modes de paiement acceptés',
        required: true,
        options: [
          { value: 'especes', label: 'Espèces' },
          { value: 'mobile', label: 'Mobile Money' },
          { value: 'carte', label: 'Carte bancaire' },
          { value: 'credit', label: 'Crédit client' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo du commerce',
        required: false,
      },
    ],
  },
  
  // === SANTÉ ===
  {
    id: 'health-survey',
    name: 'Enquête santé',
    description: 'Évaluer l\'accès aux soins et l\'état de santé',
    category: 'health',
    icon: '🏥',
    fields: [
      {
        field_type: 'text',
        label: 'Localité/Village',
        placeholder: 'Nom de la localité',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Distance au centre de santé le plus proche',
        required: true,
        options: [
          { value: 'moins_1km', label: 'Moins de 1 km' },
          { value: '1_5km', label: '1-5 km' },
          { value: '5_10km', label: '5-10 km' },
          { value: '10_20km', label: '10-20 km' },
          { value: 'plus_20km', label: 'Plus de 20 km' },
        ],
      },
      {
        field_type: 'select',
        label: 'Moyen de transport vers le centre de santé',
        required: true,
        options: [
          { value: 'pied', label: 'À pied' },
          { value: 'velo', label: 'Vélo' },
          { value: 'moto', label: 'Moto/Moto-taxi' },
          { value: 'voiture', label: 'Voiture/Taxi' },
          { value: 'ambulance', label: 'Ambulance' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Maladies fréquentes dans la zone',
        required: true,
        options: [
          { value: 'paludisme', label: 'Paludisme' },
          { value: 'diarrhee', label: 'Diarrhées' },
          { value: 'respiratoire', label: 'Infections respiratoires' },
          { value: 'malnutrition', label: 'Malnutrition' },
          { value: 'vih', label: 'VIH/SIDA' },
          { value: 'tuberculose', label: 'Tuberculose' },
          { value: 'diabete', label: 'Diabète' },
          { value: 'hypertension', label: 'Hypertension' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Couverture vaccinale des enfants',
        required: true,
        options: [
          { value: 'complete', label: 'Complète' },
          { value: 'partielle', label: 'Partielle' },
          { value: 'aucune', label: 'Aucune' },
          { value: 'ne_sait_pas', label: 'Ne sait pas' },
        ],
      },
      {
        field_type: 'select',
        label: 'Accès à l\'eau potable',
        required: true,
        options: [
          { value: 'robinet', label: 'Robinet dans la maison' },
          { value: 'fontaine', label: 'Fontaine publique' },
          { value: 'puits', label: 'Puits' },
          { value: 'source', label: 'Source/Rivière' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Type de toilettes',
        required: true,
        options: [
          { value: 'wc', label: 'WC avec chasse' },
          { value: 'latrine', label: 'Latrine améliorée' },
          { value: 'latrine_simple', label: 'Latrine simple' },
          { value: 'nature', label: 'Dans la nature' },
        ],
      },
      {
        field_type: 'number',
        label: 'Nombre de consultations médicales/an',
        required: true,
        min_value: 0,
        max_value: 100,
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
    ],
  },
  
  // === ÉDUCATION ===
  {
    id: 'education-survey',
    name: 'Enquête éducation',
    description: 'Évaluer l\'accès à l\'éducation et la qualité',
    category: 'education',
    icon: '🎓',
    fields: [
      {
        field_type: 'text',
        label: 'Nom de l\'établissement',
        placeholder: 'Nom de l\'école',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Type d\'établissement',
        required: true,
        options: [
          { value: 'maternelle', label: 'Maternelle' },
          { value: 'primaire', label: 'École primaire' },
          { value: 'college', label: 'Collège' },
          { value: 'lycee', label: 'Lycée' },
          { value: 'technique', label: 'Formation technique' },
          { value: 'superieur', label: 'Enseignement supérieur' },
        ],
      },
      {
        field_type: 'select',
        label: 'Statut',
        required: true,
        options: [
          { value: 'public', label: 'Public' },
          { value: 'prive_laic', label: 'Privé laïc' },
          { value: 'confessionnel', label: 'Confessionnel' },
          { value: 'communautaire', label: 'Communautaire' },
        ],
      },
      {
        field_type: 'number',
        label: 'Nombre d\'élèves',
        required: true,
        min_value: 0,
        max_value: 10000,
      },
      {
        field_type: 'number',
        label: 'Nombre d\'enseignants',
        required: true,
        min_value: 0,
        max_value: 500,
      },
      {
        field_type: 'number',
        label: 'Nombre de salles de classe',
        required: true,
        min_value: 0,
        max_value: 200,
      },
      {
        field_type: 'multiselect',
        label: 'Infrastructures disponibles',
        required: true,
        options: [
          { value: 'electricite', label: 'Électricité' },
          { value: 'eau', label: 'Eau courante' },
          { value: 'toilettes', label: 'Toilettes' },
          { value: 'cantine', label: 'Cantine' },
          { value: 'bibliotheque', label: 'Bibliothèque' },
          { value: 'informatique', label: 'Salle informatique' },
          { value: 'sport', label: 'Terrain de sport' },
        ],
      },
      {
        field_type: 'rating',
        label: 'État des bâtiments',
        required: true,
        min_value: 1,
        max_value: 5,
      },
      {
        field_type: 'select',
        label: 'Taux de réussite aux examens',
        required: true,
        options: [
          { value: 'moins_50', label: 'Moins de 50%' },
          { value: '50_70', label: '50-70%' },
          { value: '70_85', label: '70-85%' },
          { value: '85_95', label: '85-95%' },
          { value: 'plus_95', label: 'Plus de 95%' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo de l\'établissement',
        required: false,
      },
    ],
  },
  
  // === FINANCE / MICROFINANCE ===
  {
    id: 'microfinance-survey',
    name: 'Enquête microfinance',
    description: 'Évaluer l\'accès aux services financiers',
    category: 'finance',
    icon: '💰',
    fields: [
      {
        field_type: 'text',
        label: 'Nom du répondant',
        placeholder: 'Nom complet',
        required: true,
      },
      {
        field_type: 'select',
        label: 'Avez-vous un compte bancaire/épargne?',
        required: true,
        options: [
          { value: 'banque', label: 'Oui, banque classique' },
          { value: 'microfinance', label: 'Oui, microfinance' },
          { value: 'mobile', label: 'Oui, Mobile Money' },
          { value: 'plusieurs', label: 'Plusieurs comptes' },
          { value: 'non', label: 'Non' },
        ],
      },
      {
        field_type: 'select',
        label: 'Avez-vous déjà obtenu un crédit?',
        required: true,
        options: [
          { value: 'oui_banque', label: 'Oui, d\'une banque' },
          { value: 'oui_micro', label: 'Oui, d\'une microfinance' },
          { value: 'oui_tontine', label: 'Oui, tontine/groupe' },
          { value: 'oui_famille', label: 'Oui, famille/amis' },
          { value: 'non', label: 'Non' },
        ],
      },
      {
        field_type: 'select',
        label: 'Montant du dernier crédit',
        required: false,
        options: [
          { value: 'moins_100k', label: 'Moins de 100 000 FCFA' },
          { value: '100k_500k', label: '100 000 - 500 000 FCFA' },
          { value: '500k_1m', label: '500 000 - 1 000 000 FCFA' },
          { value: '1m_5m', label: '1 000 000 - 5 000 000 FCFA' },
          { value: 'plus_5m', label: 'Plus de 5 000 000 FCFA' },
        ],
      },
      {
        field_type: 'select',
        label: 'Utilisation du crédit',
        required: false,
        options: [
          { value: 'commerce', label: 'Commerce/Activité' },
          { value: 'agriculture', label: 'Agriculture' },
          { value: 'education', label: 'Éducation' },
          { value: 'sante', label: 'Santé' },
          { value: 'logement', label: 'Logement' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Obstacles à l\'accès au crédit',
        required: true,
        options: [
          { value: 'garantie', label: 'Manque de garantie' },
          { value: 'documents', label: 'Documents requis' },
          { value: 'taux', label: 'Taux d\'intérêt élevés' },
          { value: 'distance', label: 'Distance aux agences' },
          { value: 'meconnaissance', label: 'Méconnaissance des produits' },
          { value: 'aucun', label: 'Aucun obstacle' },
        ],
      },
      {
        field_type: 'select',
        label: 'Capacité d\'épargne mensuelle',
        required: true,
        options: [
          { value: 'aucune', label: 'Aucune' },
          { value: 'moins_10k', label: 'Moins de 10 000 FCFA' },
          { value: '10k_50k', label: '10 000 - 50 000 FCFA' },
          { value: '50k_100k', label: '50 000 - 100 000 FCFA' },
          { value: 'plus_100k', label: 'Plus de 100 000 FCFA' },
        ],
      },
      {
        field_type: 'select',
        label: 'Participez-vous à une tontine?',
        required: true,
        options: [
          { value: 'oui_regulier', label: 'Oui, régulièrement' },
          { value: 'oui_parfois', label: 'Oui, parfois' },
          { value: 'non', label: 'Non' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
    ],
  },
  
  // === AGROALIMENTAIRE ===
  {
    id: 'agribusiness-survey',
    name: 'Étude agroalimentaire',
    description: 'Analyser la transformation et la commercialisation des produits agricoles',
    category: 'agriculture',
    icon: '🏭',
    fields: [
      {
        field_type: 'text',
        label: 'Nom de l\'unité de transformation',
        placeholder: 'Nom commercial',
        required: true,
      },
      {
        field_type: 'multiselect',
        label: 'Produits transformés',
        required: true,
        options: [
          { value: 'huile', label: 'Huile' },
          { value: 'farine', label: 'Farine' },
          { value: 'jus', label: 'Jus de fruits' },
          { value: 'conserves', label: 'Conserves' },
          { value: 'cereales', label: 'Céréales transformées' },
          { value: 'viande', label: 'Viande/Poisson' },
          { value: 'lait', label: 'Produits laitiers' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'select',
        label: 'Capacité de production',
        required: true,
        options: [
          { value: 'artisanal', label: 'Artisanale (< 100 kg/jour)' },
          { value: 'semi_industriel', label: 'Semi-industrielle (100-1000 kg/jour)' },
          { value: 'industriel', label: 'Industrielle (> 1000 kg/jour)' },
        ],
      },
      {
        field_type: 'number',
        label: 'Nombre d\'employés',
        required: true,
        min_value: 0,
        max_value: 1000,
      },
      {
        field_type: 'multiselect',
        label: 'Marchés desservis',
        required: true,
        options: [
          { value: 'local', label: 'Local' },
          { value: 'regional', label: 'Régional' },
          { value: 'national', label: 'National' },
          { value: 'export', label: 'Export' },
        ],
      },
      {
        field_type: 'select',
        label: 'Certification qualité',
        required: true,
        options: [
          { value: 'aucune', label: 'Aucune' },
          { value: 'haccp', label: 'HACCP' },
          { value: 'iso', label: 'ISO' },
          { value: 'bio', label: 'Bio' },
          { value: 'autre', label: 'Autre' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Défis principaux',
        required: true,
        options: [
          { value: 'matiere', label: 'Approvisionnement matière première' },
          { value: 'energie', label: 'Coût de l\'énergie' },
          { value: 'emballage', label: 'Emballage' },
          { value: 'distribution', label: 'Distribution' },
          { value: 'financement', label: 'Financement' },
          { value: 'concurrence', label: 'Concurrence' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
      {
        field_type: 'photo',
        label: 'Photo de l\'unité',
        required: false,
      },
    ],
  },
  
  // === CONSOMMATION ===
  {
    id: 'consumer-habits',
    name: 'Habitudes de consommation',
    description: 'Étudier les comportements d\'achat des consommateurs',
    category: 'market',
    icon: '🛒',
    fields: [
      {
        field_type: 'select',
        label: 'Tranche d\'âge',
        required: true,
        options: [
          { value: '18_25', label: '18-25 ans' },
          { value: '26_35', label: '26-35 ans' },
          { value: '36_45', label: '36-45 ans' },
          { value: '46_55', label: '46-55 ans' },
          { value: 'plus_55', label: 'Plus de 55 ans' },
        ],
      },
      {
        field_type: 'select',
        label: 'Sexe',
        required: true,
        options: [
          { value: 'homme', label: 'Homme' },
          { value: 'femme', label: 'Femme' },
        ],
      },
      {
        field_type: 'select',
        label: 'Niveau de revenu mensuel',
        required: true,
        options: [
          { value: 'moins_100k', label: 'Moins de 100 000 FCFA' },
          { value: '100k_300k', label: '100 000 - 300 000 FCFA' },
          { value: '300k_500k', label: '300 000 - 500 000 FCFA' },
          { value: '500k_1m', label: '500 000 - 1 000 000 FCFA' },
          { value: 'plus_1m', label: 'Plus de 1 000 000 FCFA' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Lieux d\'achat habituels',
        required: true,
        options: [
          { value: 'marche', label: 'Marché traditionnel' },
          { value: 'supermarche', label: 'Supermarché' },
          { value: 'boutique', label: 'Boutique de quartier' },
          { value: 'online', label: 'En ligne' },
          { value: 'ambulant', label: 'Vendeur ambulant' },
        ],
      },
      {
        field_type: 'select',
        label: 'Fréquence des achats alimentaires',
        required: true,
        options: [
          { value: 'quotidien', label: 'Quotidien' },
          { value: 'plusieurs_semaine', label: 'Plusieurs fois/semaine' },
          { value: 'hebdo', label: 'Hebdomadaire' },
          { value: 'mensuel', label: 'Mensuel' },
        ],
      },
      {
        field_type: 'select',
        label: 'Budget alimentaire mensuel',
        required: true,
        options: [
          { value: 'moins_50k', label: 'Moins de 50 000 FCFA' },
          { value: '50k_100k', label: '50 000 - 100 000 FCFA' },
          { value: '100k_200k', label: '100 000 - 200 000 FCFA' },
          { value: 'plus_200k', label: 'Plus de 200 000 FCFA' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Critères d\'achat importants',
        required: true,
        options: [
          { value: 'prix', label: 'Prix' },
          { value: 'qualite', label: 'Qualité' },
          { value: 'marque', label: 'Marque' },
          { value: 'local', label: 'Produit local' },
          { value: 'bio', label: 'Bio/naturel' },
          { value: 'promotion', label: 'Promotions' },
        ],
      },
      {
        field_type: 'multiselect',
        label: 'Produits préférés (origine)',
        required: true,
        options: [
          { value: 'local', label: 'Produits locaux' },
          { value: 'regional', label: 'Produits régionaux' },
          { value: 'importe', label: 'Produits importés' },
          { value: 'indifferent', label: 'Indifférent' },
        ],
      },
      {
        field_type: 'location',
        label: 'Localisation GPS',
        required: true,
      },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  { value: 'market', label: 'Études de marché', icon: '📊' },
  { value: 'satisfaction', label: 'Satisfaction', icon: '⭐' },
  { value: 'census', label: 'Recensement', icon: '👥' },
  { value: 'agriculture', label: 'Agriculture', icon: '🌾' },
  { value: 'commerce', label: 'Commerce', icon: '🏪' },
  { value: 'health', label: 'Santé', icon: '🏥' },
  { value: 'education', label: 'Éducation', icon: '🎓' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'other', label: 'Autres', icon: '📋' },
];

export const getTemplateById = (id: string): SurveyTemplate | undefined => {
  return SURVEY_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: SurveyTemplate['category']): SurveyTemplate[] => {
  return SURVEY_TEMPLATES.filter(t => t.category === category);
};
