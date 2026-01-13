import { useMemo } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, MapPin, Clock, Copy } from 'lucide-react';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface DataQualityPanelProps {
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
}

export const DataQualityPanel = ({ responses, fields }: DataQualityPanelProps) => {
  const quality = useMemo(() => {
    const total = responses.length;
    if (total === 0) return null;

    // Completion analysis
    const requiredFields = fields.filter(f => f.required);
    const complete = responses.filter(r => 
      requiredFields.every(f => {
        const v = r.data[f.id];
        return v !== undefined && v !== null && v !== '';
      })
    ).length;
    const completionRate = Math.round((complete / total) * 100);

    // GPS verification
    const withGPS = responses.filter(r => r.location).length;
    const gpsRate = Math.round((withGPS / total) * 100);

    // Duplicate detection (based on similar data patterns)
    const dataHashes = responses.map(r => JSON.stringify(Object.values(r.data).sort()));
    const duplicates = dataHashes.filter((h, i) => dataHashes.indexOf(h) !== i).length;
    const duplicateRate = Math.round((duplicates / total) * 100);

    // Field-level completeness
    const fieldCompleteness = fields.map(f => {
      const filled = responses.filter(r => {
        const v = r.data[f.id];
        return v !== undefined && v !== null && v !== '';
      }).length;
      return {
        field: f,
        filled,
        rate: Math.round((filled / total) * 100),
      };
    });

    // Overall quality score
    const qualityScore = Math.round((completionRate * 0.4) + (gpsRate * 0.3) + ((100 - duplicateRate) * 0.3));

    return {
      total,
      complete,
      completionRate,
      withGPS,
      gpsRate,
      duplicates,
      duplicateRate,
      fieldCompleteness,
      qualityScore,
    };
  }, [responses, fields]);

  if (!quality) {
    return (
      <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucune donnée à analyser</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quality Score */}
      <Card className={quality.qualityScore >= 80 ? 'border-green-500/30' : quality.qualityScore >= 60 ? 'border-amber-500/30' : 'border-red-500/30'}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Score de qualité global</p>
              <p className="text-3xl sm:text-4xl font-bold">{quality.qualityScore}%</p>
            </div>
            <div className={`p-3 rounded-full ${quality.qualityScore >= 80 ? 'bg-green-100' : quality.qualityScore >= 60 ? 'bg-amber-100' : 'bg-red-100'}`}>
              {quality.qualityScore >= 80 ? <CheckCircle className="h-8 w-8 text-green-600" /> : 
               quality.qualityScore >= 60 ? <AlertTriangle className="h-8 w-8 text-amber-600" /> : 
               <XCircle className="h-8 w-8 text-red-600" />}
            </div>
          </div>
          <Progress value={quality.qualityScore} className="mt-3 h-2" />
        </CardContent>
      </Card>

      {/* Quality metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Complétion</span>
            </div>
            <p className="text-xl font-bold mt-1">{quality.completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">{quality.complete}/{quality.total} complets</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">GPS</span>
            </div>
            <p className="text-xl font-bold mt-1">{quality.gpsRate}%</p>
            <p className="text-[10px] text-muted-foreground">{quality.withGPS} géolocalisés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Copy className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Doublons</span>
            </div>
            <p className="text-xl font-bold mt-1">{quality.duplicates}</p>
            <p className="text-[10px] text-muted-foreground">{quality.duplicateRate}% détectés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Champs</span>
            </div>
            <p className="text-xl font-bold mt-1">{fields.length}</p>
            <p className="text-[10px] text-muted-foreground">analysés</p>
          </CardContent>
        </Card>
      </div>

      {/* Field completeness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Taux de réponse par champ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {quality.fieldCompleteness.map(({ field, filled, rate }) => (
              <div key={field.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{field.label}</span>
                {field.required && <Badge variant="outline" className="text-[8px] px-1">Requis</Badge>}
                <span className="w-12 text-right font-medium">{rate}%</span>
                <Progress value={rate} className="w-20 h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
