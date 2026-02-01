// Activity sectors for user registration
export const ACTIVITY_SECTORS = [
  { value: 'agriculture', label: 'Agriculture & Élevage' },
  { value: 'ong', label: 'ONG / Association' },
  { value: 'gouvernement', label: 'Gouvernement / Ministère' },
  { value: 'recherche', label: 'Recherche / Université' },
  { value: 'sante', label: 'Santé' },
  { value: 'education', label: 'Éducation' },
  { value: 'humanitaire', label: 'Humanitaire' },
  { value: 'consultant', label: 'Consultant / Bureau d\'étude' },
  { value: 'entreprise', label: 'Entreprise privée' },
  { value: 'statistique', label: 'Institut de statistique' },
  { value: 'developpement', label: 'Développement international' },
  { value: 'environnement', label: 'Environnement' },
  { value: 'autre', label: 'Autre' },
];

// Country-specific default names for placeholder
export const DEFAULT_NAMES_BY_COUNTRY: Record<string, string> = {
  // French-speaking Africa
  TG: 'Koffi Mensah',
  FR: 'Marie Dupont',
  CI: 'Kouamé Yao',
  SN: 'Amadou Diallo',
  BJ: 'Kpakpo Houngbo',
  BF: 'Ouédraogo Ibrahim',
  ML: 'Oumar Traoré',
  NE: 'Hassane Moussa',
  GN: 'Alpha Barry',
  CM: 'Nguema Mvondo',
  CD: 'Kabongo Mwamba',
  CG: 'Mabiala Nkouka',
  GA: 'Ondo Mba',
  MG: 'Rakoto Andry',
  MA: 'Mohamed Benali',
  DZ: 'Karim Bouzid',
  TN: 'Ahmed Trabelsi',
  BE: 'Jean Dupont',
  CH: 'Pierre Müller',
  CA: 'Jean Tremblay',
  // English-speaking
  US: 'John Smith',
  GB: 'James Wilson',
  NG: 'Chukwu Emeka',
  GH: 'Kwame Asante',
  KE: 'Kamau Wanjiku',
  ZA: 'Thabo Mbeki',
  // Default
  DEFAULT: 'Jean Dupont',
};

// Get default name based on detected country
export const getDefaultNameForCountry = (countryCode: string | null): string => {
  if (!countryCode) return DEFAULT_NAMES_BY_COUNTRY.DEFAULT;
  return DEFAULT_NAMES_BY_COUNTRY[countryCode.toUpperCase()] || DEFAULT_NAMES_BY_COUNTRY.DEFAULT;
};
