import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BarChart3 } from 'lucide-react';
import { DbSurvey, DbSurveyResponse } from '@/hooks/useSurveys';
import { DetailedAnalysis } from '@/components/DetailedAnalysis';
import { SurveyResponsesView } from '@/components/SurveyResponsesView';

interface DataModuleTabsProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

export const DataModuleTabs = ({ survey, responses }: DataModuleTabsProps) => {
  return (
    <Tabs defaultValue="responses" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="responses" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Réponses simples
        </TabsTrigger>
        <TabsTrigger value="analysis" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analyse détaillée
        </TabsTrigger>
      </TabsList>

      <TabsContent value="responses" className="mt-0">
        <SurveyResponsesView survey={survey} responses={responses} />
      </TabsContent>

      <TabsContent value="analysis" className="mt-0">
        <DetailedAnalysis survey={survey} responses={responses} />
      </TabsContent>
    </Tabs>
  );
};
