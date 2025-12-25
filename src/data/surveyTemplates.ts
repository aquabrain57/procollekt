export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'market' | 'satisfaction' | 'census' | 'other';
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
}

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'market-study',
    name: 'Étude de marché',
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
  {
    id: 'census',
    name: 'Recensement',
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
];

export const getTemplateById = (id: string): SurveyTemplate | undefined => {
  return SURVEY_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: SurveyTemplate['category']): SurveyTemplate[] => {
  return SURVEY_TEMPLATES.filter(t => t.category === category);
};
