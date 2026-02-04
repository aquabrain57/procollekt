import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, Mail, Smartphone, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { toast } from 'sonner';

interface NotificationsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const NotificationsSection = ({ isExpanded, onToggle }: NotificationsSectionProps) => {
  const { t } = useTranslation();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const handleNotificationChange = (type: string, enabled: boolean) => {
    switch (type) {
      case 'email':
        setEmailNotifications(enabled);
        break;
      case 'push':
        setPushNotifications(enabled);
        break;
      case 'sms':
        setSmsNotifications(enabled);
        break;
    }
    toast.success(`Notifications ${type} ${enabled ? 'activées' : 'désactivées'}`);
  };

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Bell className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Notifications</CardTitle>
                  <CardDescription className="text-xs">Gérez vos préférences de notification</CardDescription>
                </div>
              </div>
              <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4" />
                <div>
                  <span className="text-sm font-medium">Notifications par email</span>
                  <p className="text-xs text-muted-foreground">Résumés et alertes par email</p>
                </div>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4" />
                <div>
                  <span className="text-sm font-medium">Notifications push</span>
                  <p className="text-xs text-muted-foreground">Alertes en temps réel sur l'appareil</p>
                </div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={(checked) => handleNotificationChange('push', checked)}
              />
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4" />
                <div>
                  <span className="text-sm font-medium">Notifications SMS</span>
                  <p className="text-xs text-muted-foreground">Alertes importantes par SMS</p>
                </div>
              </div>
              <Switch
                checked={smsNotifications}
                onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
