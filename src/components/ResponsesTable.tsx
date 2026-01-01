import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Download, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown,
  MapPin, Clock, Eye, FileSpreadsheet, FileText, File,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { DbSurvey, DbSurveyResponse, DbSurveyField, useSurveyFields } from '@/hooks/useSurveys';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedResponse, setSelectedResponse] = useState<DbSurveyResponse | null>(null);
  const [filterField, setFilterField] = useState<string>('all');
  const [filterValue, setFilterValue] = useState('');

  // Sort and filter responses
  const processedResponses = useMemo(() => {
    let result = [...responses];

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
  }, [responses, searchTerm, sortColumn, sortDirection, filterField, filterValue]);

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

  // Get visible fields (first 5)
  const visibleFields = fields.slice(0, 5);
  const hasMoreFields = fields.length > 5;

  // Format cell value for display
  const formatCellValue = (value: any, field: DbSurveyField) => {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if ('latitude' in value) return `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`;
      return JSON.stringify(value);
    }
    const strValue = String(value);
    return strValue.length > 30 ? strValue.slice(0, 30) + '...' : strValue;
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ['#', 'Date', 'Heure', 'Localisation', ...fields.map(f => f.label)];
    const rows = processedResponses.map((response, index) => {
      const date = format(new Date(response.created_at), 'dd/MM/yyyy');
      const time = format(new Date(response.created_at), 'HH:mm:ss');
      const location = response.location 
        ? `${response.location.latitude.toFixed(6)}, ${response.location.longitude.toFixed(6)}`
        : '';
      
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        if (typeof value === 'object' && value !== null) return JSON.stringify(value);
        return value?.toString() || '';
      });

      return [index + 1, date, time, location, ...fieldValues];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${survey.title}_reponses.csv`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const headers = ['#', 'Date', 'Heure', 'Latitude', 'Longitude', ...fields.map(f => f.label)];
    const rows = processedResponses.map((response, index) => {
      const fieldValues = fields.map(field => {
        const value = response.data[field.id];
        if (Array.isArray(value)) return value.join('; ');
        return value?.toString() || '';
      });

      return [
        index + 1,
        format(new Date(response.created_at), 'dd/MM/yyyy'),
        format(new Date(response.created_at), 'HH:mm:ss'),
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
          <p className="text-sm text-muted-foreground">
            {processedResponses.length} réponse{processedResponses.length !== 1 ? 's' : ''} 
            {searchTerm || filterValue ? ` (filtré de ${responses.length})` : ''}
          </p>
        </div>
        
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Global search */}
            <div className="relative flex-1">
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

            {/* Field filter */}
            <Select value={filterField} onValueChange={(v) => {
              setFilterField(v);
              setFilterValue('');
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
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

            {filterField !== 'all' && (
              <Input
                placeholder={`Valeur pour ${fields.find(f => f.id === filterField)?.label}...`}
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-[200px]"
              />
            )}
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
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Date
                        {getSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('location')}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        GPS
                        {getSortIcon('location')}
                      </div>
                    </TableHead>
                    {visibleFields.map(field => (
                      <TableHead 
                        key={field.id}
                        className="cursor-pointer hover:bg-muted/50 max-w-[200px]"
                        onClick={() => handleSort(field.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{field.label}</span>
                          {getSortIcon(field.id)}
                        </div>
                      </TableHead>
                    ))}
                    {hasMoreFields && (
                      <TableHead className="text-muted-foreground">
                        +{fields.length - 5} cols
                      </TableHead>
                    )}
                    <TableHead className="w-[80px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResponses.map((response, index) => (
                    <TableRow key={response.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-muted-foreground">
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
                        {response.location ? (
                          <Badge variant="secondary" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            GPS
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {visibleFields.map(field => (
                        <TableCell key={field.id} className="max-w-[200px]">
                          <span className="truncate block">
                            {formatCellValue(response.data[field.id], field)}
                          </span>
                        </TableCell>
                      ))}
                      {hasMoreFields && (
                        <TableCell className="text-muted-foreground text-xs">
                          ...
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedResponse(response)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
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
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages || 1}
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
            {selectedResponse && (
              <div className="space-y-4">
                {/* Location */}
                {selectedResponse.location && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Localisation:</span>
                      <span>
                        {selectedResponse.location.latitude.toFixed(6)}, {selectedResponse.location.longitude.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}

                {/* All fields */}
                <div className="space-y-3">
                  {fields.map((field) => {
                    const value = selectedResponse.data[field.id];
                    
                    let displayValue: React.ReactNode;
                    if (value === undefined || value === null || value === '') {
                      displayValue = <span className="text-muted-foreground italic">Non renseigné</span>;
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
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
