import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table2, BarChart3, Crown, LineChart, Map, Brain, Shield, Download } from 'lucide-react';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import { ResponsesTable } from '@/components/ResponsesTable';
import { AnalyticsDashboard } from '@/components/analytics';
import { PremiumReport } from '@/components/PremiumReport';

interface DataModuleTabsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const DataModuleTabs = ({ survey, responses }: DataModuleTabsProps) => {
  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <LineChart className="h-4 w-4" />
          <span className="hidden sm:inline">Analyse & Rapports</span>
          <span className="sm:hidden">Analyse</span>
        </TabsTrigger>
        <TabsTrigger value="table" className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="hidden sm:inline">Table des réponses</span>
          <span className="sm:hidden">Table</span>
        </TabsTrigger>
        <TabsTrigger value="premium" className="flex items-center gap-2">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Premium</span>
          <span className="sm:hidden">Pro</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="mt-0">
        <AnalyticsDashboard survey={survey} responses={responses} />
      </TabsContent>

      <TabsContent value="table" className="mt-0">
        <ResponsesTable survey={survey} responses={responses} />
      </TabsContent>

      <TabsContent value="premium" className="mt-0">
        <PremiumReport survey={survey} responses={responses} />
      </TabsContent>
    </Tabs>
  );
};
