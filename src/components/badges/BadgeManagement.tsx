import { useState } from 'react';
import { Plus, Search, Eye, Trash2, UserX, UserCheck, QrCode, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useSurveyorBadges, SurveyorBadge } from '@/hooks/useSurveyorBadges';
import { CreateBadgeDialog } from './CreateBadgeDialog';
import { BadgeCard } from './BadgeCard';
import { BadgePDFExport } from './BadgePDFExport';
import { SurveyorItinerary } from './SurveyorItinerary';
import { QRStyleSelector, QRStyle } from './QRStyleSelector';
import { toast } from 'sonner';

export function BadgeManagement() {
  const { badges, loading, deleteBadge, suspendBadge, activateBadge, refetch } = useSurveyorBadges();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<SurveyorBadge | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [badgeToDelete, setBadgeToDelete] = useState<string | null>(null);
  const [itineraryBadge, setItineraryBadge] = useState<SurveyorBadge | null>(null);
  const [qrStyleDialogOpen, setQrStyleDialogOpen] = useState(false);
  const [selectedQRStyle, setSelectedQRStyle] = useState<QRStyle>('classic');

  const filteredBadges = badges.filter(badge => 
    badge.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.surveyor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    badge.organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'suspended':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'suspended': return 'Suspendu';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'surveyor': return 'Enquêteur';
      case 'supervisor': return 'Superviseur';
      case 'team_lead': return "Chef d'équipe";
      case 'coordinator': return 'Coordinateur';
      default: return role;
    }
  };

  const handleDelete = async () => {
    if (badgeToDelete) {
      await deleteBadge(badgeToDelete);
      setBadgeToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleToggleStatus = async (badge: SurveyorBadge) => {
    if (badge.status === 'active') {
      await suspendBadge(badge.id);
    } else {
      await activateBadge(badge.id);
    }
  };

  const stats = {
    total: badges.length,
    active: badges.filter(b => b.status === 'active').length,
    suspended: badges.filter(b => b.status === 'suspended').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Badges</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <QrCode className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspendus</p>
                <p className="text-3xl font-bold text-red-600">{stats.suspended}</p>
              </div>
              <UserX className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Gestion des Badges</CardTitle>
              <CardDescription>Créez et gérez les badges de vos enquêteurs</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau Badge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, ID ou organisation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredBadges.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun badge trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Aucun résultat pour cette recherche' : 'Créez votre premier badge enquêteur'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un badge
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block md:hidden space-y-3">
              {filteredBadges.map((badge) => (
                <Card key={badge.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={badge.photo_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {badge.first_name[0]}{badge.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{badge.first_name} {badge.last_name}</p>
                            <Badge variant="secondary" className={`${getStatusColor(badge.status)} text-[10px]`}>
                              {getStatusLabel(badge.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">ID: {badge.surveyor_id}</p>
                          {badge.role && (
                            <p className="text-xs text-muted-foreground">{getRoleLabel(badge.role)}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedBadge(badge);
                            setViewDialogOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setItineraryBadge(badge)}>
                            <Route className="w-4 h-4 mr-2" />
                            Itinéraire
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(badge)}>
                            {badge.status === 'active' ? (
                              <><UserX className="w-4 h-4 mr-2" />Suspendre</>
                            ) : (
                              <><UserCheck className="w-4 h-4 mr-2" />Activer</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              setBadgeToDelete(badge.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enquêteur</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBadges.map((badge) => (
                    <TableRow key={badge.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={badge.photo_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {badge.first_name[0]}{badge.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[120px]">{badge.first_name} {badge.last_name}</p>
                            {badge.phone && (
                              <p className="text-xs text-muted-foreground">{badge.phone}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{badge.surveyor_id}</TableCell>
                      <TableCell>{getRoleLabel(badge.role)}</TableCell>
                      <TableCell className="max-w-[100px] truncate">{badge.organization || '-'}</TableCell>
                      <TableCell className="max-w-[80px] truncate">{badge.covered_zone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(badge.status)}>
                          {getStatusLabel(badge.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedBadge(badge);
                              setViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir le badge
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setItineraryBadge(badge)}>
                              <Route className="w-4 h-4 mr-2" />
                              Itinéraire & Activité
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(badge)}>
                              {badge.status === 'active' ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Suspendre
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setBadgeToDelete(badge.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateBadgeDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {/* View Badge Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Badge Enquêteur</DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <Tabs defaultValue="badge" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="badge">Badge</TabsTrigger>
                <TabsTrigger value="qr">Style QR</TabsTrigger>
              </TabsList>
              <TabsContent value="badge" className="space-y-4 mt-4">
                <BadgeCard badge={selectedBadge} qrStyle={selectedQRStyle} />
                <BadgePDFExport badge={selectedBadge} />
              </TabsContent>
              <TabsContent value="qr" className="mt-4">
                <QRStyleSelector 
                  badge={selectedBadge} 
                  selectedStyle={selectedQRStyle}
                  onStyleChange={setSelectedQRStyle}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Itinerary Dialog */}
      <Dialog open={!!itineraryBadge} onOpenChange={(open) => !open && setItineraryBadge(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Itinéraire & Activité
            </DialogTitle>
          </DialogHeader>
          {itineraryBadge && (
            <SurveyorItinerary badge={itineraryBadge} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le badge ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le badge sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
