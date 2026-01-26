import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown,
  MapPin, Clock, Eye, FileSpreadsheet, FileText, File,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize2,
  User, IdCard, Trash2, Phone, Globe
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField, useSurveyFields, useSurveyResponses } from '@/hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LocationBadge, LocationDisplay, LocationFull } from '@/components/LocationDisplay';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ResponsesTableProps {
  survey: DbSurvey;
  responses: DbSurveyResponse[];
}

type SortDirection = 'asc' | 'desc' | null;
type SortColumn = 'date' | 'location' | string;

export const ResponsesTable = ({ survey, responses }: ResponsesTableProps) => {
  const { fields } = useSurveyFields(survey.id);
  const { deleteResponse } = useSurveyResponses(survey.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedResponse, setSelectedResponse] = useState<DbSurveyResponse | null>(null);
  const [filterField, setFilterField] = useState<string>('all');
  const [filterValue, setFilterValue] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [enumeratorTerm, setEnumeratorTerm] = useState<string>('');
  const [zoneTerm, setZoneTerm] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to format phone numbers professionally
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format based on length
    if (cleaned.length === 10) {
      // Format: XX XX XX XX XX
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // Format: 0X XX XX XX XX
      return cleaned.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1$2 $3 $4 $5 $6');
    } else if (cleaned.length >= 8 && cleaned.length <= 15) {
      // International format with spaces every 2-3 digits
      return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '+$1 $2 $3');
    }
    return phone;
  };

  // Check if form has surveyor_id field
  const hasSurveyorIdField = fields.some(f => f.field_type === 'surveyor_id');

  // Sort and filter responses
  const processedResponses = useMemo(() => {
    let result = [...responses];

    const asDay = (d: string) => {
      // d is YYYY-MM-DD
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, (m || 1) - 1, day || 1);
    };

    // Advanced: date range filter (created_at)
    if (dateFrom) {
      const from = asDay(dateFrom).getTime();
      result = result.filter(r => new Date(r.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = asDay(dateTo);
      to.setHours(23, 59, 59, 999);
      const toMs = to.getTime();
      result = result.filter(r => new Date(r.created_at).getTime() <= toMs);
    }

    // Auto-detect "enquêteur" and "zone" fields by label, fallback to global search
    const enumeratorFieldId = fields.find(f => /enqu[êe]teur|agent|interview/i.test(f.label))?.id;
    const zoneFieldId = fields.find(f => /zone|quartier|village|localit/i.test(f.label))?.id;

    if (enumeratorTerm) {
      const q = enumeratorTerm.toLowerCase();
      result = result.filter(r => {
        const v = enumeratorFieldId ? r.data[enumeratorFieldId] : Object.values(r.data);
        const hay = Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
        return hay.toLowerCase().includes(q);
      });
    }

    if (zoneTerm) {
      const q = zoneTerm.toLowerCase();
      result = result.filter(r => {
        // Try zone field first
        const v = zoneFieldId ? r.data[zoneFieldId] : '';
        const zoneHay = Array.isArray(v) ? v.join(' ') : typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');

        // Also allow matching GPS string
        const gpsHay = r.location ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}` : '';
        return zoneHay.toLowerCase().includes(q) || gpsHay.toLowerCase().includes(q);
      });
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(response => {
        return Object.values(response.data).some(value =>
          String(value).toLowerCase().includes(searchLower)
        ) || format(new Date(response.created_at), 'dd/MM/yyyy HH:mm').includes(searchLower);
      });
    }

    // Field-specific filter
    if (filterField !== 'all' && filterValue) {
      result = result.filter(response => {
        const value = response.data[filterField];
        if (Array.isArray(value)) {
          return value.some(v => String(v).toLowerCase().includes(filterValue.toLowerCase()));
        }
        return String(value || '').toLowerCase().includes(filterValue.toLowerCase());
      });
    }

    // Sort
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;

        if (sortColumn === 'date') {
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
        } else if (sortColumn === 'location') {
          aVal = a.location ? 1 : 0;
          bVal = b.location ? 1 : 0;
        } else {
          aVal = String(a.data[sortColumn] || '');
          bVal = String(b.data[sortColumn] || '');
        }

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return result;
  }, [responses, searchTerm, sortColumn, sortDirection, filterField, filterValue, dateFrom, dateTo, enumeratorTerm, zoneTerm, fields]);

  // Pagination
  const totalPages = Math.ceil(processedResponses.length / pageSize);
  const paginatedResponses = processedResponses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Helper to get option label from field options
  const getOptionLabel = (field: DbSurveyField, value: any): string => {
    if (!field.options || !Array.isArray(field.options)) return String(value);
    
    const valueStr = String(value);
    const options = field.options as any[];
    
    const found = options.find(opt => {
      if (typeof opt === 'string') return opt === valueStr;
      return opt.value === valueStr || opt.label === valueStr;
    });
    
    if (found) {
      return typeof found === 'string' ? found : (found.label || found.value || valueStr);
    }
    
    // Handle "Option XX" pattern - map to actual option labels
    if (valueStr.match(/^Option\s*\d+$/i) && options.length > 0) {
      const match = valueStr.match(/\d+/);
      if (match) {
        const idx = parseInt(match[0], 10) - 1;
        if (idx >= 0 && idx < options.length) {
          const opt = options[idx];
          return typeof opt === 'string' ? opt : (opt.label || opt.value || valueStr);
        }
      }
    }
    
    return valueStr;
  };

  // Format cell value for display with proper labels
  const formatCellValue = (value: any, field: DbSurveyField) => {
    if (value === undefined || value === null || value === '') return '—';
    
    // Handle select/multiselect fields - show actual labels
    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      if (Array.isArray(value)) {
        return value.map(v => getOptionLabel(field, v)).join(', ');
      }
      return getOptionLabel(field, value);
    }
    
    // Handle phone numbers - format professionally
    if (field.field_type === 'phone') {
      return (
        <span className="font-mono text-sm tracking-wide whitespace-nowrap">
          {formatPhoneNumber(String(value))}
        </span>
      );
    }
    
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if ('latitude' in value) return `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
      return JSON.stringify(value);
    }
    const strValue = String(value);
    return strValue.length > 50 ? strValue.slice(0, 50) + '...' : strValue;
  };

  // Handle response deletion
  const handleDeleteResponse = async (responseId: string) => {
    setIsDeleting(true);
    try {
      const success = await deleteResponse(responseId);
      if (success) {
        setDeleteConfirmId(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display value for exports with proper labels
  const getDisplayValue = (field: DbSurveyField, value: any): string => {
    if (value === undefined || value === null || value === '') return '';
    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      if (Array.isArray(value)) {
        return value.map(v => getOptionLabel(field, v)).join('; ');
      }
      return getOptionLabel(field, value);
    }
    if (Array.isArray(value)) return value.join('; ');
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return value?.toString() || '';
  };

  // Export functions with proper labels
  const exportToCSV = () => {
    const baseHeaders = ['#', 'Date', 'Heure'];
    const surveyorHeaders = hasSurveyorIdField ? ['ID Enquêteur', 'Nom Enquêteur'] : [];
    const headers = [...baseHeaders, ...surveyorHeaders, 'Localisation', ...fields.map(f => f.label)];
    
    const rows = processedResponses.map((response, index) => {
      const date = format(new Date(response.created_at), 'dd/MM/yyyy');
      const time = format(new Date(response.created_at), 'HH:mm:ss');
      const location = response.location 
        ? `${response.location.latitude.toFixed(6)}, ${response.location.longitude.toFixed(6)}`
        : '';
      
      // Extract surveyor info
      const surveyorIdField = fields.find(f => f.field_type === 'surveyor_id');
      const surveyorData = surveyorIdField ? response.data[surveyorIdField.id] : null;
      let surveyorId = response.surveyor_id || '';
      let surveyorName = '';
      if (typeof surveyorData === 'object' && surveyorData !== null) {
        surveyorName = surveyorData.surveyor_name || '';
        surveyorId = surveyorData.surveyor_id || surveyorId;
      }
      
      const surveyorValues = hasSurveyorIdField ? [surveyorId, surveyorName] : [];
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        // Format phone numbers for export
        if (field.field_type === 'phone' && value) {
          return formatPhoneNumber(String(value));
        }
        return getDisplayValue(field, value);
      });

      return [index + 1, date, time, ...surveyorValues, location, ...fieldValues];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${survey.title}_reponses.csv`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const baseHeaders = ['#', 'Date', 'Heure'];
    const surveyorHeaders = hasSurveyorIdField ? ['ID Enquêteur', 'Nom Enquêteur'] : [];
    const headers = [...baseHeaders, ...surveyorHeaders, 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    
    const rows = processedResponses.map((response, index) => {
      // Extract surveyor info
      const surveyorIdField = fields.find(f => f.field_type === 'surveyor_id');
      const surveyorData = surveyorIdField ? response.data[surveyorIdField.id] : null;
      let surveyorId = response.surveyor_id || '';
      let surveyorName = '';
      if (typeof surveyorData === 'object' && surveyorData !== null) {
        surveyorName = surveyorData.surveyor_name || '';
        surveyorId = surveyorData.surveyor_id || surveyorId;
      }
      
      const surveyorValues = hasSurveyorIdField ? [surveyorId, surveyorName] : [];
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        // Format phone numbers for export
        if (field.field_type === 'phone' && value) {
          return formatPhoneNumber(String(value));
        }
        return getDisplayValue(field, value);
      });

      return [
        index + 1,
        format(new Date(response.created_at), 'dd/MM/yyyy'),
        format(new Date(response.created_at), 'HH:mm:ss'),
        ...surveyorValues,
        response.location?.latitude || '',
        response.location?.longitude || '',
        ...fieldValues,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Réponses');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout]), `${survey.title}_reponses.xlsx`);
  };

  const tableContent = (
    <div className="overflow-auto" style={{ maxHeight: isFullscreen ? 'calc(100vh - 180px)' : '600px' }}>
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[50px] sticky left-0 bg-card z-20">#</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 min-w-[120px]"
              onClick={() => handleSort('date')}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Date
                {getSortIcon('date')}
              </div>
            </TableHead>
            <TableHead className="min-w-[150px]">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Enquêteur
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 min-w-[100px]"
              onClick={() => handleSort('location')}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS
                {getSortIcon('location')}
              </div>
            </TableHead>
            {fields.map(field => (
              <TableHead 
                key={field.id}
                className="cursor-pointer hover:bg-muted/50 min-w-[150px] max-w-[300px]"
                onClick={() => handleSort(field.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">{field.label}</span>
                  {getSortIcon(field.id)}
                </div>
              </TableHead>
            ))}
            <TableHead className="w-[80px] text-center sticky right-0 bg-card z-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedResponses.map((response, index) => {
            // Extract surveyor info from response data or direct fields
            const surveyorIdField = fields.find(f => f.field_type === 'surveyor_id');
            const surveyorData = surveyorIdField ? response.data[surveyorIdField.id] : null;
            
            let surveyorName = '';
            let surveyorId = response.surveyor_id || '';
            
            if (typeof surveyorData === 'object' && surveyorData !== null) {
              surveyorName = surveyorData.surveyor_name || '';
              surveyorId = surveyorData.surveyor_id || surveyorId;
            }
            
            return (
            <TableRow key={response.id} className="hover:bg-muted/30">
              <TableCell className="font-mono text-muted-foreground sticky left-0 bg-card">
                {(currentPage - 1) * pageSize + index + 1}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {format(new Date(response.created_at), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(response.created_at), 'HH:mm')}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {(surveyorName || surveyorId || response.surveyor_validated) ? (
                  <div className="text-sm">
                    {surveyorName && (
                      <div className="font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" />
                        <span className="truncate max-w-[120px]">{surveyorName}</span>
                      </div>
                    )}
                    {surveyorId && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <IdCard className="h-3 w-3" />
                        {surveyorId}
                      </div>
                    )}
                    {response.surveyor_validated && (
                      <span className="inline-flex items-center text-[10px] text-green-600 font-medium">
                        ✓ Validé
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell>
                {response.location ? (
                  <LocationBadge 
                    latitude={response.location.latitude} 
                    longitude={response.location.longitude}
                    altitude={(response.location as any).altitude}
                    showAltitude={true}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              {fields.map(field => (
                <TableCell key={field.id} className="min-w-[150px] max-w-[300px]">
                  <span className="block whitespace-normal break-words">
                    {formatCellValue(response.data[field.id], field)}
                  </span>
                </TableCell>
              ))}
              <TableCell className="text-center sticky right-0 bg-card">
                <div className="flex items-center justify-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedResponse(response)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <AlertDialog open={deleteConfirmId === response.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(response.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette réponse ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. La réponse sera définitivement supprimée de la base de données.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteResponse(response.id)}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="text-sm text-muted-foreground">
          {processedResponses.length} réponse{processedResponses.length !== 1 ? 's' : ''} affichée{processedResponses.length !== 1 ? 's' : ''}
          {searchTerm || filterValue || dateFrom || dateTo || enumeratorTerm || zoneTerm ? (
            <span className="ml-1 text-primary font-medium">
              (filtré de {responses.length})
            </span>
          ) : null}
        </div>
        
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="sm" onClick={() => setIsFullscreen(true)}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Plein écran
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="h-4 w-4 mr-2" />
                CSV (.csv)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Global search */}
            <div className="relative md:col-span-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans toutes les colonnes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Date from */}
            <div className="md:col-span-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Date début"
              />
            </div>

            {/* Date to */}
            <div className="md:col-span-2">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Date fin"
              />
            </div>

            {/* Advanced quick filters */}
            <div className="md:col-span-2 flex gap-2">
              <Input
                placeholder="Enquêteur"
                value={enumeratorTerm}
                onChange={(e) => {
                  setEnumeratorTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-w-0"
              />
            </div>

            <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <Input
                  placeholder="Zone (quartier/village)"
                  value={zoneTerm}
                  onChange={(e) => {
                    setZoneTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Field filter */}
              <div className="md:col-span-4">
                <Select value={filterField} onValueChange={(v) => {
                  setFilterField(v);
                  setFilterValue('');
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrer par..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les champs</SelectItem>
                    {fields.map(field => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4">
                <Input
                  placeholder={filterField !== 'all'
                    ? `Valeur pour ${fields.find(f => f.id === filterField)?.label}...`
                    : 'Valeur (optionnel)'}
                  value={filterValue}
                  onChange={(e) => {
                    setFilterValue(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={filterField === 'all'}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {responses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="font-medium text-foreground">Aucune réponse collectée</p>
            <p className="text-sm text-muted-foreground">Les réponses apparaîtront ici une fois collectées</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            {tableContent}
          </Card>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Lignes par page:</span>
              <Select 
                value={String(pageSize)} 
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages || 1} ({processedResponses.length} total)
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{survey.title} - Table complète</span>
              <span className="text-sm font-normal text-muted-foreground">
                {processedResponses.length} réponses
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {tableContent}
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Lignes par page:</span>
              <Select 
                value={String(pageSize)} 
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} / {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Response detail dialog */}
      <Dialog open={!!selectedResponse} onOpenChange={() => setSelectedResponse(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détail de la réponse
              {selectedResponse && (
                <Badge variant="secondary">
                  {format(new Date(selectedResponse.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedResponse && (() => {
              // Extract surveyor info
              const surveyorIdField = fields.find(f => f.field_type === 'surveyor_id');
              const surveyorData = surveyorIdField ? selectedResponse.data[surveyorIdField.id] : null;
              let surveyorName = '';
              let surveyorId = selectedResponse.surveyor_id || '';
              if (typeof surveyorData === 'object' && surveyorData !== null) {
                surveyorName = surveyorData.surveyor_name || '';
                surveyorId = surveyorData.surveyor_id || surveyorId;
              }

              return (
              <div className="space-y-4">
                {/* Surveyor Info */}
                {(surveyorName || surveyorId) && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Enquêteur</p>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        {surveyorName && <p className="font-semibold text-foreground">{surveyorName}</p>}
                        {surveyorId && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <IdCard className="h-3 w-3" />
                            ID: {surveyorId}
                          </p>
                        )}
                      </div>
                      {selectedResponse.surveyor_validated && (
                        <Badge variant="default" className="bg-green-600 ml-auto">
                          ✓ Validé
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Location with full details */}
                {selectedResponse.location && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Localisation GPS
                    </p>
                    <LocationFull
                      latitude={selectedResponse.location.latitude}
                      longitude={selectedResponse.location.longitude}
                    />
                  </div>
                )}

                {/* All fields */}
                <div className="space-y-3">
                  {fields.map((field) => {
                    const value = selectedResponse.data[field.id];
                    
                    // Skip surveyor_id field as it's shown above
                    if (field.field_type === 'surveyor_id') return null;
                    
                    let displayValue: React.ReactNode;
                    if (value === undefined || value === null || value === '') {
                      displayValue = <span className="text-muted-foreground italic">Non renseigné</span>;
                    } else if (field.field_type === 'phone') {
                      displayValue = (
                        <span className="font-mono text-foreground tracking-wide">
                          {formatPhoneNumber(String(value))}
                        </span>
                      );
                    } else if (field.field_type === 'select' || field.field_type === 'multiselect') {
                      if (Array.isArray(value)) {
                        displayValue = (
                          <div className="flex flex-wrap gap-1">
                            {value.map((v, i) => (
                              <Badge key={i} variant="outline">{getOptionLabel(field, v)}</Badge>
                            ))}
                          </div>
                        );
                      } else {
                        displayValue = <Badge variant="outline">{getOptionLabel(field, value)}</Badge>;
                      }
                    } else if (Array.isArray(value)) {
                      displayValue = (
                        <div className="flex flex-wrap gap-1">
                          {value.map((v, i) => (
                            <Badge key={i} variant="outline">{v}</Badge>
                          ))}
                        </div>
                      );
                    } else if (field.field_type === 'rating') {
                      displayValue = (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Number(value) }).map((_, i) => (
                            <span key={i} className="text-yellow-500 text-lg">★</span>
                          ))}
                          <span className="text-muted-foreground ml-2">({value}/{field.max_value || 5})</span>
                        </div>
                      );
                    } else if (field.field_type === 'photo' && typeof value === 'string' && value.startsWith('data:image')) {
                      displayValue = (
                        <img src={value} alt="Photo" className="max-w-full h-auto rounded-lg border" />
                      );
                    } else {
                      displayValue = <span className="text-foreground">{String(value)}</span>;
                    }

                    return (
                      <div key={field.id} className="border-b border-border pb-3 last:border-0">
                        <p className="text-sm font-medium text-muted-foreground mb-1">{field.label}</p>
                        <div>{displayValue}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};