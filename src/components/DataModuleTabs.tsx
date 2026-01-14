import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table2, BarChart3, Crown, LineChart, Activity } from 'lucide-react';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import { ResponsesTable } from '@/components/ResponsesTable';
import { AnalyticsDashboard } from '@/components/analytics';
import { PremiumReport } from '@/components/PremiumReport';
import { RealtimeDashboard } from '@/components/RealtimeDashboard';

interface DataModuleTabsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const DataModuleTabs = ({ survey, responses }: DataModuleTabsProps) => {
  return (
    <Tabs defaultValue="realtime" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="realtime" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Temps réel</span>
          <span className="sm:hidden">Live</span>
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <LineChart className="h-4 w-4" />
          <span className="hidden sm:inline">Analyse</span>
          <span className="sm:hidden">Stats</span>
        </TabsTrigger>
        <TabsTrigger value="table" className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          <span className="hidden sm:inline">Table</span>
          <span className="sm:hidden">Table</span>
        </TabsTrigger>
        <TabsTrigger value="premium" className="flex items-center gap-2">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Premium</span>
          <span className="sm:hidden">Pro</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="realtime" className="mt-0">
        <RealtimeDashboard surveys={[survey]} surveyId={survey.id} />
      </TabsContent>

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