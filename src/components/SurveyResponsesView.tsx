import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Download } from 'lucide-react';
import { DbSurvey, DbSurveyResponse, useSurveyFields } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SurveyResponsesViewProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const SurveyResponsesView = ({ survey, responses }: SurveyResponsesViewProps) => {
  const { fields } = useSurveyFields(survey.id);

  const exportToCSV = () => {
    if (responses.length === 0 || fields.length === 0) return;

    const headers = ['Date', 'Localisation', ...fields.map(f => f.label)];
    const rows = responses.map(response => {
      const location = response.location 
        ? `${response.location.latitude}, ${response.location.longitude}`
        : '';
      
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        return value?.toString() || '';
      });

      return [
        format(new Date(response.created_at), 'dd/MM/yyyy HH:mm'),
        location,
        ...fieldValues,
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.title.replace(/\s+/g, '_')}_reponses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          <p className="text-sm text-muted-foreground">
            {responses.length} réponse{responses.length !== 1 ? 's' : ''} collectée{responses.length !== 1 ? 's' : ''}
          </p>
        </div>
        {responses.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        )}
      </div>

      {responses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="font-medium">Aucune réponse</p>
          <p className="text-sm">Les réponses des enquêteurs apparaîtront ici</p>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4">
            {responses.map((response) => (
              <div
                key={response.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(response.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                  {response.location && (
                    <span className="inline-flex items-center text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {response.location.latitude.toFixed(4)}, {response.location.longitude.toFixed(4)}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  {fields.map((field) => {
                    const value = response.data[field.id];
                    if (value === undefined || value === null || value === '') return null;

                    return (
                      <div key={field.id} className="text-sm">
                        <span className="font-medium text-muted-foreground">
                          {field.label}:
                        </span>{' '}
                        <span className="text-foreground">
                          {Array.isArray(value) ? value.join(', ') : value.toString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
