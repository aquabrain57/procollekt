import { useState, useMemo, useEffect } from 'react';
import { MapPin, Globe, TrendingUp, AlertTriangle, Loader2, Navigation, Target, User } from 'lucide-react';
import { DbSurveyResponse, DbSurveyField } from '@/hooks/useSurveys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsesMapLibre } from '@/components/ResponsesMapLibre';
import { reverseGeocodeBatch } from '@/hooks/useReverseGeocode';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

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
    responses.filter(r => 
      r.location && 
      typeof r.location.latitude === 'number' && 
      typeof r.location.longitude === 'number' &&
      !isNaN(r.location.latitude) &&
      !isNaN(r.location.longitude)
    ),
    [responses]
  );

  // Zone-based analysis (from survey field)
  const zoneAnalysis = useMemo(() => {
    if (!zoneFieldId) return null;
    
    const zoneField = fields.find(f => f.id === zoneFieldId);
    const zoneCounts: Record<string, number> = {};
    
    responses.forEach(r => {
      const zone = r.data[zoneFieldId];
      if (zone && typeof zone === 'string') {
        // Get proper label if field has options
        let label = zone;
        if (zoneField?.options && Array.isArray(zoneField.options)) {
          const opt = (zoneField.options as any[]).find(o => 
            (typeof o === 'string' && o === zone) || o.value === zone
          );
          if (opt) {
            label = typeof opt === 'string' ? opt : (opt.label || opt.value || zone);
          }
        }
        zoneCounts[label] = (zoneCounts[label] || 0) + 1;
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
  }, [responses, zoneFieldId, fields]);

  // Geocode locations for city/region analysis
  useEffect(() => {
    const analyzeGeography = async () => {
      if (geoResponses.length < 3) {
        setGeoData(null);
        return;
      }

      setLoading(true);
      try {
        const locations = geoResponses.slice(0, 50).map(r => ({
          id: r.id,
          latitude: r.location!.latitude,
          longitude: r.location!.longitude,
        }));

        const geocoded = await reverseGeocodeBatch(locations);

        const byCityMap: Record<string, { count: number; country: string | null }> = {};
        const byRegionMap: Record<string, number> = {};
        const byCountryMap: Record<string, number> = {};

        geocoded.forEach((loc) => {
          if (loc.city) {
            const cityKey = loc.city;
            if (!byCityMap[cityKey]) {
              byCityMap[cityKey] = { count: 0, country: loc.country };
            }
            byCityMap[cityKey].count++;
          }
          if (loc.region) byRegionMap[loc.region] = (byRegionMap[loc.region] || 0) + 1;
          if (loc.country) byCountryMap[loc.country] = (byCountryMap[loc.country] || 0) + 1;
        });

        const total = geocoded.size;
        
        const byCity = Object.entries(byCityMap)
          .map(([name, data]) => ({
            name: data.country ? `${name}, ${data.country}` : name,
            count: data.count,
            percentage: Math.round((data.count / total) * 100),
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
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MapPin className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoResponses.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Géolocalisées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoRate}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Taux GPS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Globe className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold">{geoData?.byCity.length || zoneAnalysis?.length || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Zones couvertes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${geoData?.hotspots && geoData.hotspots.length > 0 ? 'from-amber-500/10 to-amber-600/5 border-amber-500/20' : 'from-muted/50 to-muted/30'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${geoData?.hotspots && geoData.hotspots.length > 0 ? 'bg-amber-500/20' : 'bg-muted'}`}>
                <Target className={`h-4 w-4 ${geoData?.hotspots && geoData.hotspots.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
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
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Carte des réponses
          </CardTitle>
          <CardDescription className="text-xs">
            Visualisation géographique en temps réel de la collecte
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsesMapLibre responses={responses} fields={fields} />
        </CardContent>
      </Card>

      {/* Zone analysis from field */}
      {zoneAnalysis && zoneAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Répartition par zone d'enquête
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution basée sur les zones définies dans le formulaire
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bar chart */}
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneAnalysis} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => [
                        `${value} réponses (${props.payload.percentage}%)`,
                        'Réponses'
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="url(#colorGradient)" radius={[0, 4, 4, 0]}>
                      {zoneAnalysis.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={zoneAnalysis.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {zoneAnalysis.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Zone details */}
            <div className="mt-4 space-y-2">
              {zoneAnalysis.map((zone, idx) => (
                <div key={zone.name} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium">{zone.name}</span>
                      <span className="text-muted-foreground ml-2 whitespace-nowrap">
                        {zone.count} rép. ({zone.percentage}%)
                      </span>
                    </div>
                    <Progress value={zone.percentage} className="h-1.5 mt-1" />
                  </div>
                </div>
              ))}
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
            <p className="text-xs text-muted-foreground mt-1">Géocodage inverse des positions GPS</p>
          </CardContent>
        </Card>
      )}

      {geoData && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* By City */}
          {geoData.byCity.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Répartition par ville (GPS)
                </CardTitle>
                <CardDescription className="text-xs">
                  Localités identifiées par géocodage inverse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {geoData.byCity.map((city, idx) => (
                    <div key={city.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="truncate font-medium">{city.name}</span>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {city.count} ({city.percentage}%)
                        </span>
                      </div>
                      <Progress value={city.percentage} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hotspots */}
          {geoData.hotspots.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Zones à fort potentiel
                </CardTitle>
                <CardDescription className="text-xs">
                  Concentrations significatives identifiées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {geoData.hotspots.map((hotspot, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        hotspot.type === 'high' 
                          ? 'bg-amber-500/10 border-amber-500/30' 
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={hotspot.type === 'high' ? 'default' : 'secondary'}
                          className={`text-[10px] ${hotspot.type === 'high' ? 'bg-amber-600' : ''}`}
                        >
                          {hotspot.type === 'high' ? '🔥 Prioritaire' : '📊 Prometteur'}
                        </Badge>
                        <span className="font-semibold text-sm">{hotspot.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{hotspot.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Regions */}
          {geoData.byRegion.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Couverture régionale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {geoData.byRegion.map((region, idx) => (
                    <div 
                      key={region.name}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{region.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {region.count} ({region.percentage}%)
                      </Badge>
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
            <div className="p-4 rounded-full bg-muted/50 inline-block mb-4">
              <MapPin className="h-10 w-10 opacity-40" />
            </div>
            <p className="font-medium">Aucune donnée géolocalisée</p>
            <p className="text-sm mt-1">Les analyses géographiques apparaîtront quand des réponses GPS seront collectées</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
