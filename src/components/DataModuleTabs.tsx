import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table2, BarChart3 } from 'lucide-react';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import { ResponsesTable } from '@/components/ResponsesTable';
import { AdvancedReports } from '@/components/AdvancedReports';

interface DataModuleTabsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const DataModuleTabs = ({ survey, responses }: DataModuleTabsProps) => {
  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="table" className="flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          Table des réponses
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Rapports avancés
        </TabsTrigger>
      </TabsList>

      <TabsContent value="table" className="mt-0">
        <ResponsesTable survey={survey} responses={responses} />
      </TabsContent>

      <TabsContent value="reports" className="mt-0">
        <AdvancedReports survey={survey} responses={responses} />
      </TabsContent>
    </Tabs>
  );
};
