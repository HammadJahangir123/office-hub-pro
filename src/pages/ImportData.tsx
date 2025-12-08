import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface ImportRow {
  'IP Address': string;
  'Username': string;
  'Email ID': string;
  'Department': string;
  'Section': string;
  'computer name': string;
  'Seriel Number': string;
  'specification': string;
  'LED': string;
  'Pinter': string;
  'Scanner': string;
  'Keboard': string;
  'Mouse': string;
  'Internet Access': string;
  'USB Access': string;
  'Last PM': string;
  'Ext Number': string;
}

const ImportData = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }>({ total: 0, success: 0, failed: 0, errors: [] });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const convertToBoolean = (value: string): boolean => {
    const normalized = value?.trim().toUpperCase();
    return normalized === 'YES' || normalized === 'TRUE';
  };

  const parseExcelDate = (value: any): string | null => {
    if (!value || value === '') return null;
    
    // If it's already a date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  const extractSerialNumbers = (data: any[]): { led_serial: string; printer_serial: string; scanner_serial: string } => {
    // The Excel has multiple "Seriel Number" columns after LED, Printer, and Scanner
    // We need to extract them in order
    let led_serial = '';
    let printer_serial = '';
    let scanner_serial = '';
    
    // Find indices of LED, Printer, Scanner columns
    const headers = Object.keys(data[0] || {});
    const ledIndex = headers.findIndex(h => h === 'LED');
    const printerIndex = headers.findIndex(h => h === 'Pinter');
    const scannerIndex = headers.findIndex(h => h === 'Scanner');
    
    // Get serial numbers from the columns that follow
    if (ledIndex >= 0 && headers[ledIndex + 1]?.includes('Seriel Number')) {
      led_serial = data[0][headers[ledIndex + 1]] || '';
    }
    if (printerIndex >= 0 && headers[printerIndex + 1]?.includes('Seriel Number')) {
      printer_serial = data[0][headers[printerIndex + 1]] || '';
    }
    if (scannerIndex >= 0 && headers[scannerIndex + 1]?.includes('Seriel Number')) {
      scanner_serial = data[0][headers[scannerIndex + 1]] || '';
    }
    
    return { led_serial, printer_serial, scanner_serial };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportStatus({ total: 0, success: 0, failed: 0, errors: [] });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const total = jsonData.length;
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const row of jsonData) {
        try {
          // Helper function to get value from various column name variations
          const getValue = (keys: string[]): string | null => {
            for (const key of keys) {
              const found = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
              if (found && row[found] !== undefined && row[found] !== '') {
                return String(row[found]);
              }
            }
            return null;
          };

          // Get username with flexible column matching
          const username = getValue(['Username', 'User Name', 'User', 'username']) || '';
          
          // Get name - try direct column first, then generate from username
          let name = getValue(['Name', 'Full Name', 'Employee Name', 'name']);
          if (!name && username) {
            name = username
              .split('.')
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ');
          }

          // Get email with flexible matching
          const email = getValue(['Email ID', 'Email', 'E-mail', 'email', 'Email Address']) || '';

          // Get department and section
          const department = getValue(['Department', 'Dept', 'department']) || '';
          const section = getValue(['Section', 'section', 'Unit']);

          // Find serial number columns dynamically
          const rowKeys = Object.keys(row);
          const serialNumberKeys = rowKeys.filter(key => 
            key.toLowerCase().includes('serial') || key.toLowerCase().includes('seriel')
          );
          
          const led_serial = serialNumberKeys[0] ? (row[serialNumberKeys[0]] || null) : null;
          const printer_serial = serialNumberKeys[1] ? (row[serialNumberKeys[1]] || null) : null;
          const scanner_serial = serialNumberKeys[2] ? (row[serialNumberKeys[2]] || null) : null;

          // Build employee data - all fields are optional except required ones
          const employeeData = {
            name: name || username || 'Unknown',
            username: username || email?.split('@')[0] || 'unknown',
            email: email || '',
            department: department || 'Unassigned',
            section: section || null,
            computer_name: getValue(['computer name', 'Computer Name', 'PC Name', 'Computer']) || null,
            computer_serial: getValue(['Seriel Number', 'Serial Number', 'Computer Serial', 'PC Serial']) || null,
            ip_address: getValue(['IP Address', 'IP', 'ip address', 'IP Add']) || null,
            specs: getValue(['specification', 'Specification', 'Specs', 'System Specs', 'Computer Specs']) || null,
            led_model: getValue(['LED', 'LCD', 'Monitor', 'LED Model', 'LCD Model']) || null,
            led_serial: led_serial,
            printer_model: getValue(['Pinter', 'Printer', 'Printer Model']) || null,
            printer_serial: printer_serial,
            scanner_model: getValue(['Scanner', 'Scanner Model']) || null,
            scanner_serial: scanner_serial,
            keyboard: getValue(['Keboard', 'Keyboard', 'KB']) || null,
            mouse: getValue(['Mouse', 'mouse']) || null,
            internet_access: getValue(['Internet Access', 'Internet', 'Net Access']) 
              ? convertToBoolean(getValue(['Internet Access', 'Internet', 'Net Access']) || '') 
              : true,
            usb_access: getValue(['USB Access', 'USB', 'USB Port']) 
              ? convertToBoolean(getValue(['USB Access', 'USB', 'USB Port']) || '') 
              : null,
            last_pm: parseExcelDate(getValue(['Last PM', 'PM Date', 'Last Maintenance'])),
            extension_number: getValue(['Ext Number', 'Extension', 'Ext', 'Extension Number', 'Phone']) || null,
            location: getValue(['Location', 'location', 'Office', 'Branch']) || null,
            created_by: user?.id,
          };

          const { error } = await supabase.from('employees').insert(employeeData);

          if (error) {
            failed++;
            errors.push(`Row ${success + failed}: ${error.message}`);
          } else {
            success++;
          }
        } catch (err) {
          failed++;
          errors.push(`Row ${success + failed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      setImportStatus({ total, success, failed, errors });

      if (success > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${success} of ${total} records.`,
        });
      }

      if (failed > 0) {
        toast({
          title: 'Import Warnings',
          description: `${failed} records failed to import. Check details below.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to parse Excel file',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card animate-fade-in shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="ghost" size="icon" className="hover-scale">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Import Employee Data</h1>
                <p className="text-sm text-muted-foreground">
                  Upload Excel file to bulk import employee records
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in-up flex-1">
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Excel File</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Select an Excel file (.xlsx) containing employee data to import
              </p>
              
              <div className="mb-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={importing}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    disabled={importing}
                    className="cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </>
                    )}
                  </Button>
                </label>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Flexible Import:</strong> Empty/missing fields will be imported as blank values.</p>
                <p>Supported columns: IP Address, Username, Email, Department, Section, Computer Name, Location, etc.</p>
                <p>Column names are matched flexibly (e.g., "Email ID" or "Email" both work).</p>
              </div>
            </div>

            {importStatus.total > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Import Results
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Records:</span>
                    <span className="font-semibold">{importStatus.total}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Successful:</span>
                    <span className="font-semibold">{importStatus.success}</span>
                  </div>
                  {importStatus.failed > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Failed:</span>
                      <span className="font-semibold">{importStatus.failed}</span>
                    </div>
                  )}
                </div>

                {importStatus.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      Errors:
                    </h4>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md p-3 max-h-48 overflow-y-auto">
                      {importStatus.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-400 mb-1">
                          {error}
                        </div>
                      ))}
                      {importStatus.errors.length > 10 && (
                        <div className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          ... and {importStatus.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {importStatus.success > 0 && (
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="w-full mt-4"
                  >
                    View Dashboard
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default ImportData;
