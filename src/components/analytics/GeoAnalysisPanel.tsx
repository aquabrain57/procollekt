import { useState, useMemo, useEffect } from 'react';
import { MapPin, Globe, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsesMap } from '@/components/ResponsesMap';
import { reverseGeocodeBatch } from '@/hooks/useReverseGeocode';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface GeoAnalysisPanelProps {
  responses: DbSurveyResponse[];
  fields: DbSurveyField[];
  zoneFieldId?: string;
}

interface GeoData {
  byCity: { name: string; count: number; percentage: number }[];
  byRegion: { name: string; count: number; percentage: number }[];
  hotspots: { name: string; description: string; type: 'high' | 'medium' | 'low' }[];
}

export const GeoAnalysisPanel = ({ responses, fields, zoneFieldId }: GeoAnalysisPanelProps) => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(false);

  const geoResponses = useMemo(() => 
    responses.filter(r => r.location && r.location.latitude && r.location.longitude),
    [responses]
  );

  // Zone-based analysis (from survey field)
  const zoneAnalysis = useMemo(() => {
    if (!zoneFieldId) return null;
    
    const zoneCounts: Record<string, number> = {};
    responses.forEach(r => {
      const zone = r.data[zoneFieldId];
      if (zone && typeof zone === 'string') {
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
      }
    });

    const total = Object.values(zoneCounts).reduce((a, b) => a + b, 0);
    return Object.entries(zoneCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [responses, zoneFieldId]);

  // Geocode locations for city/region analysis
  useEffect(() => {
    const analyzeGeography = async () => {
      if (geoResponses.length < 3) {
        setGeoData(null);
        return;
      }

      setLoading(true);
      try {
        const locations = geoResponses.slice(0, 30).map(r => ({
          id: r.id,
          latitude: r.location!.latitude,
          longitude: r.location!.longitude,
        }));

        const geocoded = await reverseGeocodeBatch(locations);

        const byCityMap: Record<string, number> = {};
        const byRegionMap: Record<string, number> = {};

        geocoded.forEach((loc) => {
          if (loc.city) byCityMap[loc.city] = (byCityMap[loc.city] || 0) + 1;
          if (loc.region) byRegionMap[loc.region] = (byRegionMap[loc.region] || 0) + 1;
        });

        const total = geocoded.size;
        
        const byCity = Object.entries(byCityMap)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const byRegion = Object.entries(byRegionMap)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Generate hotspots
        const hotspots: GeoData['hotspots'] = [];
        if (byCity.length > 0) {
          if (byCity[0].percentage > 40) {
            hotspots.push({
              name: byCity[0].name,
              description: `Zone à très fort potentiel: ${byCity[0].percentage}% des répondants`,
              type: 'high',
            });
          }
          byCity.slice(1, 4).forEach(city => {
            if (city.percentage >= 15) {
              hotspots.push({
                name: city.name,
                description: `Zone prometteuse: ${city.percentage}% du marché`,
                type: 'medium',
              });
            }
          });
        }

        setGeoData({ byCity, byRegion, hotspots });
      } catch (error) {
        console.error('Geographic analysis error:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeGeography();
  }, [geoResponses]);

  const geoRate = responses.length > 0 ? Math.round((geoResponses.length / responses.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoResponses.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Géolocalisées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Taux GPS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoData?.byCity.length || zoneAnalysis?.length || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Zones couvertes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${geoData?.hotspots && geoData.hotspots.length > 0 ? 'bg-amber-100' : 'bg-muted'}`}>
                <AlertTriangle className={`h-4 w-4 ${geoData?.hotspots && geoData.hotspots.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoData?.hotspots?.length || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Hotspots</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Carte des réponses
          </CardTitle>
          <CardDescription className="text-xs">
            Visualisation géographique de la collecte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsesMap responses={responses} fields={fields} />
        </CardContent>
      </Card>

      {/* Zone analysis from field */}
      {zoneAnalysis && zoneAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Répartition par zone (champ enquête)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneAnalysis} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Réponses']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* City/Region analysis from GPS */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Analyse géographique en cours...</p>
          </CardContent>
        </Card>
      )}

      {geoData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By City */}
          {geoData.byCity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Par ville/localité (GPS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {geoData.byCity.map((city, idx) => (
                    <div key={city.name} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded shrink-0" 
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 truncate">{city.name}</span>
                      <span className="font-medium">{city.count}</span>
                      <span className="text-muted-foreground w-10 text-right">{city.percentage}%</span>
                      <Progress value={city.percentage} className="w-12 h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotspots */}
          {geoData.hotspots.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Zones à fort potentiel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {geoData.hotspots.map((hotspot, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={hotspot.type === 'high' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {hotspot.type === 'high' ? '🔥 Prioritaire' : '📊 Prometteur'}
                        </Badge>
                        <span className="font-medium text-sm">{hotspot.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{hotspot.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {geoResponses.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Aucune donnée géolocalisée</p>
            <p className="text-sm">Les analyses géographiques apparaîtront quand des réponses GPS seront collectées</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
