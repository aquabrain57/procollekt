// Templates de design pour les formulaires

export interface FormDesignTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  styles: {
    primaryColor: string;
    backgroundColor: string;
    cardBackground: string;
    textColor: string;
    accentColor: string;
    borderRadius: string;
    fontFamily: string;
    inputStyle: 'minimal' | 'bordered' | 'filled' | 'underlined';
    buttonStyle: 'solid' | 'outline' | 'gradient';
  };
}

export const FORM_DESIGN_TEMPLATES: FormDesignTemplate[] = [
  {
    id: 'modern-blue',
    name: 'Moderne Bleu',
    description: 'Design épuré avec accents bleus',
    preview: '🔵',
    styles: {
      primaryColor: '221 83% 53%',
      backgroundColor: '210 40% 98%',
      cardBackground: '0 0% 100%',
      textColor: '222 47% 11%',
      accentColor: '221 83% 53%',
      borderRadius: '0.75rem',
      fontFamily: 'Inter, sans-serif',
      inputStyle: 'bordered',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'emerald-nature',
    name: 'Nature Émeraude',
    description: 'Tons verts naturels et apaisants',
    preview: '🟢',
    styles: {
      primaryColor: '142 76% 36%',
      backgroundColor: '138 76% 97%',
      cardBackground: '0 0% 100%',
      textColor: '140 50% 10%',
      accentColor: '142 76% 36%',
      borderRadius: '1rem',
      fontFamily: 'Nunito, sans-serif',
      inputStyle: 'filled',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Coucher de Soleil',
    description: 'Couleurs chaudes et accueillantes',
    preview: '🟠',
    styles: {
      primaryColor: '25 95% 53%',
      backgroundColor: '30 100% 98%',
      cardBackground: '0 0% 100%',
      textColor: '20 50% 10%',
      accentColor: '25 95% 53%',
      borderRadius: '0.5rem',
      fontFamily: 'Poppins, sans-serif',
      inputStyle: 'minimal',
      buttonStyle: 'gradient',
    },
  },
  {
    id: 'royal-purple',
    name: 'Violet Royal',
    description: 'Élégance et sophistication',
    preview: '🟣',
    styles: {
      primaryColor: '262 83% 58%',
      backgroundColor: '260 60% 98%',
      cardBackground: '0 0% 100%',
      textColor: '262 47% 11%',
      accentColor: '262 83% 58%',
      borderRadius: '0.75rem',
      fontFamily: 'Playfair Display, serif',
      inputStyle: 'bordered',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'minimalist-gray',
    name: 'Minimaliste',
    description: 'Simple, propre et professionnel',
    preview: '⚪',
    styles: {
      primaryColor: '0 0% 20%',
      backgroundColor: '0 0% 98%',
      cardBackground: '0 0% 100%',
      textColor: '0 0% 10%',
      accentColor: '0 0% 30%',
      borderRadius: '0.25rem',
      fontFamily: 'Space Grotesk, sans-serif',
      inputStyle: 'underlined',
      buttonStyle: 'outline',
    },
  },
  {
    id: 'ocean-teal',
    name: 'Océan Tropical',
    description: 'Bleu-vert frais et moderne',
    preview: '🔷',
    styles: {
      primaryColor: '174 72% 40%',
      backgroundColor: '174 60% 97%',
      cardBackground: '0 0% 100%',
      textColor: '174 50% 10%',
      accentColor: '174 72% 40%',
      borderRadius: '1rem',
      fontFamily: 'DM Sans, sans-serif',
      inputStyle: 'filled',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'coral-pink',
    name: 'Corail Doux',
    description: 'Rose délicat et moderne',
    preview: '🩷',
    styles: {
      primaryColor: '350 89% 60%',
      backgroundColor: '350 100% 98%',
      cardBackground: '0 0% 100%',
      textColor: '350 50% 10%',
      accentColor: '350 89% 60%',
      borderRadius: '1.5rem',
      fontFamily: 'Quicksand, sans-serif',
      inputStyle: 'bordered',
      buttonStyle: 'gradient',
    },
  },
  {
    id: 'dark-elegance',
    name: 'Élégance Sombre',
    description: 'Mode sombre sophistiqué',
    preview: '⬛',
    styles: {
      primaryColor: '210 40% 98%',
      backgroundColor: '224 71% 4%',
      cardBackground: '224 71% 10%',
      textColor: '210 40% 98%',
      accentColor: '217 91% 60%',
      borderRadius: '0.75rem',
      fontFamily: 'Inter, sans-serif',
      inputStyle: 'bordered',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'african-earth',
    name: 'Terre d\'Afrique',
    description: 'Couleurs chaudes terreuses',
    preview: '🟤',
    styles: {
      primaryColor: '30 50% 40%',
      backgroundColor: '30 30% 96%',
      cardBackground: '30 30% 100%',
      textColor: '30 50% 10%',
      accentColor: '15 70% 50%',
      borderRadius: '0.5rem',
      fontFamily: 'Ubuntu, sans-serif',
      inputStyle: 'filled',
      buttonStyle: 'solid',
    },
  },
  {
    id: 'golden-luxury',
    name: 'Luxe Doré',
    description: 'Doré prestigieux et premium',
    preview: '🟡',
    styles: {
      primaryColor: '45 93% 47%',
      backgroundColor: '45 50% 98%',
      cardBackground: '0 0% 100%',
      textColor: '45 50% 10%',
      accentColor: '45 93% 47%',
      borderRadius: '0rem',
      fontFamily: 'Cormorant Garamond, serif',
      inputStyle: 'underlined',
      buttonStyle: 'outline',
    },
  },
];

export const getTemplateById = (id: string): FormDesignTemplate | undefined => {
  return FORM_DESIGN_TEMPLATES.find(t => t.id === id);
};
