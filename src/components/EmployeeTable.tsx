import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeForm } from './EmployeeForm';
import { Download, Edit, Eye, Loader2, Search, Trash2, Filter, Users, Calendar as CalendarIcon, X, FileSpreadsheet, Printer } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  username: string;
  email: string;
  department: string;
  section: string;
  location: string | null;
  computer_name: string | null;
  ip_address: string | null;
  extension_number: string | null;
  created_at: string;
}

interface EmployeeTableProps {
  isAdmin: boolean;
}

export const EmployeeTable = ({ isAdmin }: EmployeeTableProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    fetchEmployees();

    // Set up real-time subscription for immediate updates
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setEmployees(prev => [payload.new as Employee, ...prev]);
            toast.success('New employee added');
          } else if (payload.eventType === 'UPDATE') {
            setEmployees(prev => 
              prev.map(emp => emp.id === payload.new.id ? payload.new as Employee : emp)
            );
          } else if (payload.eventType === 'DELETE') {
            setEmployees(prev => prev.filter(emp => emp.id !== payload.old.id));
            toast.success('Employee deleted successfully');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, locationFilter, sectionFilter, fromDate, toDate]);

  // Reset department filter when location changes and update available departments
  useEffect(() => {
    if (locationFilter === 'all') {
      // Show all departments when no location is selected
      const uniqueDepts = [...new Set(employees.map(e => e.department).filter(dept => dept && dept.trim() !== ''))];
      setDepartments(uniqueDepts);
    } else {
      // Show only departments that exist at the selected location
      const deptsAtLocation = [...new Set(
        employees
          .filter(e => e.location === locationFilter)
          .map(e => e.department)
          .filter(dept => dept && dept.trim() !== '')
      )];
      setDepartments(deptsAtLocation);
      
      // Reset department filter if current selection is not available at this location
      if (departmentFilter !== 'all' && !deptsAtLocation.includes(departmentFilter)) {
        setDepartmentFilter('all');
      }
    }
  }, [locationFilter, employees]);

  // Reset section filter when department changes and update available sections
  useEffect(() => {
    let filteredByLocation = employees;
    if (locationFilter !== 'all') {
      filteredByLocation = filteredByLocation.filter(e => e.location === locationFilter);
    }

    if (departmentFilter === 'all') {
      // Show all sections when no department is selected (but still respect location filter)
      const uniqueSections = [...new Set(filteredByLocation.map(e => e.section).filter(sec => sec && sec.trim() !== ''))];
      setSections(uniqueSections);
    } else {
      // Show only sections that exist in the selected department
      const sectionsInDept = [...new Set(
        filteredByLocation
          .filter(e => e.department === departmentFilter)
          .map(e => e.section)
          .filter(sec => sec && sec.trim() !== '')
      )];
      setSections(sectionsInDept);
      
      // Reset section filter if current selection is not available in this department
      if (sectionFilter !== 'all' && !sectionsInDept.includes(sectionFilter)) {
        setSectionFilter('all');
      }
    }
  }, [departmentFilter, locationFilter, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
      
      // Extract unique departments, filtering out empty strings
      const uniqueDepts = [...new Set(data?.map(e => e.department).filter(dept => dept && dept.trim() !== '') || [])];
      setDepartments(uniqueDepts);
      
      // Extract unique locations
      const uniqueLocations = [...new Set(data?.map(e => e.location).filter(loc => loc && loc.trim() !== '') || [])];
      setLocations(uniqueLocations);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(e => e.location === locationFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(e => e.department === departmentFilter);
    }

    // Section filter
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(e => e.section === sectionFilter);
    }

    // Date range filter
    if (fromDate || toDate) {
      filtered = filtered.filter(e => {
        const createdDate = new Date(e.created_at);
        if (fromDate && toDate) {
          return createdDate >= fromDate && createdDate <= toDate;
        } else if (fromDate) {
          return createdDate >= fromDate;
        } else if (toDate) {
          return createdDate <= toDate;
        }
        return true;
      });
    }

    // Search filter (multi-field)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.name.toLowerCase().includes(term) ||
          e.username.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term) ||
          e.ip_address?.toLowerCase().includes(term) ||
          e.computer_name?.toLowerCase().includes(term) ||
          e.extension_number?.toLowerCase().includes(term)
      );
    }

    setFilteredEmployees(filtered);
  };

  const clearDateFilter = () => {
    setFromDate(undefined);
    setToDate(undefined);
  };

  const handleView = async (employeeId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setSelectedEmployee(data);
    setIsViewOpen(true);
  };

  const handleEdit = async (employeeId: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setSelectedEmployee(data);
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deleteEmployee.id);

      if (error) throw error;

      // Real-time subscription will handle the UI update and toast
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteEmployee(null);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Username',
      'Email',
      'Location',
      'Department',
      'Section',
      'Computer Name',
      'IP Address',
      'Extension',
    ];
    
    const csvData = filteredEmployees.map(e => [
      e.name,
      e.username,
      e.email,
      e.location || '',
      e.department,
      e.section,
      e.computer_name || '',
      e.ip_address || '',
      e.extension_number || '',
    ]);

    const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('Exported to CSV');
  };

  const exportToExcel = () => {
    const data = filteredEmployees.map((e: any) => ({
      'Name': e.name,
      'Username': e.username,
      'Email': e.email,
      'Location': e.location || '',
      'Department': e.department,
      'Section': e.section,
      'Extension': e.extension_number || '',
      // Computer Information
      'Computer Name': e.computer_name || '',
      'Computer Serial': e.computer_serial || '',
      'IP Address': e.ip_address || '',
      'Specifications': e.specs || '',
      'Last PM Date': e.last_pm ? new Date(e.last_pm).toLocaleDateString() : '',
      // Peripherals & Devices
      'LED/LCD Model': e.led_model || '',
      'LED/LCD Serial': e.led_serial || '',
      'Printer Model': e.printer_model || '',
      'Printer Serial': e.printer_serial || '',
      'Scanner Model': e.scanner_model || '',
      'Scanner Serial': e.scanner_serial || '',
      'Keyboard': e.keyboard ? 'Yes' : 'No',
      'Mouse': e.mouse ? 'Yes' : 'No',
      // Access Permissions
      'Internet Access': e.internet_access ? 'Yes' : 'No',
      'USB Access': e.usb_access ? 'Yes' : 'No',
      // Custom Peripherals
      'Custom Peripherals': e.custom_peripherals?.length > 0 
        ? e.custom_peripherals.map((p: any) => `${p.name}${p.model ? ` (${p.model})` : ''}${p.serial ? ` - ${p.serial}` : ''}`).join('; ')
        : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    XLSX.writeFile(workbook, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Exported to Excel');
  };

  const printTable = () => {
    const printContent = `
      <html>
        <head>
          <title>Employee List</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f4f4f4; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .print-date { color: #666; font-size: 12px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>Employee List</h1>
          <p class="print-date">Printed on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Location</th>
                <th>Department</th>
                <th>Section</th>
                <th>IP Address</th>
                <th>Extension</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEmployees.map(e => `
                <tr>
                  <td>${e.name}</td>
                  <td>${e.email}</td>
                  <td>${e.location || '-'}</td>
                  <td>${e.department}</td>
                  <td>${e.section}</td>
                  <td>${e.ip_address || '-'}</td>
                  <td>${e.extension_number || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const printEmployeeDetails = () => {
    if (!selectedEmployee) return;
    
    const customPeripherals = selectedEmployee.custom_peripherals || [];
    const customPeripheralsHtml = customPeripherals.length > 0 
      ? `
        <h3>Additional Peripherals</h3>
        <table>
          <thead><tr><th>Name</th><th>Model</th><th>Serial</th></tr></thead>
          <tbody>
            ${customPeripherals.map((p: any) => `
              <tr>
                <td>${p.name || '-'}</td>
                <td>${p.model || '-'}</td>
                <td>${p.serial || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '';

    const printContent = `
      <html>
        <head>
          <title>Employee Details - ${selectedEmployee.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 5px; }
            h2 { color: #666; font-size: 14px; margin-bottom: 20px; }
            h3 { color: #333; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .field { margin-bottom: 8px; }
            .label { font-size: 12px; color: #666; }
            .value { font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 13px; }
            th { background-color: #f4f4f4; }
            .print-date { color: #666; font-size: 12px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>${selectedEmployee.name}</h1>
          <h2>${selectedEmployee.department} - ${selectedEmployee.section}</h2>
          <p class="print-date">Printed on: ${new Date().toLocaleString()}</p>
          
          <h3>Personal Information</h3>
          <div class="grid">
            <div class="field"><div class="label">Username</div><div class="value">${selectedEmployee.username}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${selectedEmployee.email}</div></div>
            <div class="field"><div class="label">Extension</div><div class="value">${selectedEmployee.extension_number || '-'}</div></div>
            <div class="field"><div class="label">Location</div><div class="value">${selectedEmployee.location || '-'}</div></div>
          </div>
          
          <h3>Computer Information</h3>
          <div class="grid">
            <div class="field"><div class="label">Computer Name</div><div class="value">${selectedEmployee.computer_name || '-'}</div></div>
            <div class="field"><div class="label">Computer Serial</div><div class="value">${selectedEmployee.computer_serial || '-'}</div></div>
            <div class="field"><div class="label">IP Address</div><div class="value">${selectedEmployee.ip_address || '-'}</div></div>
            <div class="field"><div class="label">Last PM Date</div><div class="value">${selectedEmployee.last_pm ? new Date(selectedEmployee.last_pm).toLocaleDateString() : '-'}</div></div>
          </div>
          <div class="field"><div class="label">System Specifications</div><div class="value">${selectedEmployee.specs || '-'}</div></div>
          
          <h3>Peripherals & Devices</h3>
          <div class="grid">
            <div class="field"><div class="label">LED/LCD Model</div><div class="value">${selectedEmployee.led_model || '-'}</div></div>
            <div class="field"><div class="label">LED/LCD Serial</div><div class="value">${selectedEmployee.led_serial || '-'}</div></div>
            <div class="field"><div class="label">Printer Model</div><div class="value">${selectedEmployee.printer_model || '-'}</div></div>
            <div class="field"><div class="label">Printer Serial</div><div class="value">${selectedEmployee.printer_serial || '-'}</div></div>
            <div class="field"><div class="label">Scanner Model</div><div class="value">${selectedEmployee.scanner_model || '-'}</div></div>
            <div class="field"><div class="label">Scanner Serial</div><div class="value">${selectedEmployee.scanner_serial || '-'}</div></div>
            <div class="field"><div class="label">Keyboard</div><div class="value">${selectedEmployee.keyboard ? 'Yes' : 'No'}</div></div>
            <div class="field"><div class="label">Mouse</div><div class="value">${selectedEmployee.mouse ? 'Yes' : 'No'}</div></div>
          </div>
          
          ${customPeripheralsHtml}
          
          <h3>Access Permissions</h3>
          <div class="grid">
            <div class="field"><div class="label">Internet Access</div><div class="value">${selectedEmployee.internet_access ? 'Yes' : 'No'}</div></div>
            <div class="field"><div class="label">USB Access</div><div class="value">${selectedEmployee.usb_access ? 'Yes' : 'No'}</div></div>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Search & Filter</CardTitle>
          </div>
          <CardDescription>Find employees by any field</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, email, IP, computer name, or extension..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(sec => (
                  <SelectItem key={sec} value={sec}>
                    {sec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToExcel} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={printTable} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {(fromDate || toDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                  className="hover-scale"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            {(fromDate || toDate) && (
              <p className="text-sm text-muted-foreground">
                Showing employees added {fromDate && `from ${format(fromDate, "PPP")}`}
                {fromDate && toDate && ' '}
                {toDate && `to ${format(toDate, "PPP")}`}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-4 w-4" />
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
              <TableRow key={employee.id} className="transition-all duration-200 hover:bg-accent/50">
                <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.location || '-'}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.section}</TableCell>
                      <TableCell>{employee.ip_address || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleView(employee.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(employee.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteEmployee(employee)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl gradient-text">Employee Details</DialogTitle>
                <DialogDescription>Complete information for {selectedEmployee?.name}</DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={printEmployeeDetails} className="mr-8">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-primary">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedEmployee.name}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Username</p>
                    <p className="font-medium">{selectedEmployee.username}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedEmployee.email}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Extension</p>
                    <p className="font-medium">{selectedEmployee.extension_number || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedEmployee.department}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Section</p>
                    <p className="font-medium">{selectedEmployee.section}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedEmployee.location || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Computer Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-secondary">Computer Information</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Computer Name</p>
                    <p className="font-medium">{selectedEmployee.computer_name || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Computer Serial</p>
                    <p className="font-medium">{selectedEmployee.computer_serial || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                    <p className="font-medium">{selectedEmployee.ip_address || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Last PM Date</p>
                    <p className="font-medium">
                      {selectedEmployee.last_pm 
                        ? new Date(selectedEmployee.last_pm).toLocaleDateString() 
                        : '-'}
                    </p>
                  </div>
                  <div className="col-span-2 animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">System Specifications</p>
                    <p className="font-medium">{selectedEmployee.specs || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Peripherals */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-accent">Peripherals & Devices</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">LED/LCD Model</p>
                    <p className="font-medium">{selectedEmployee.led_model || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">LED/LCD Serial</p>
                    <p className="font-medium">{selectedEmployee.led_serial || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Printer Model</p>
                    <p className="font-medium">{selectedEmployee.printer_model || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Printer Serial</p>
                    <p className="font-medium">{selectedEmployee.printer_serial || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Scanner Model</p>
                    <p className="font-medium">{selectedEmployee.scanner_model || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Scanner Serial</p>
                    <p className="font-medium">{selectedEmployee.scanner_serial || '-'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Keyboard</p>
                    <p className="font-medium">
                      {selectedEmployee.keyboard ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Mouse</p>
                    <p className="font-medium">
                      {selectedEmployee.mouse ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Peripherals */}
              {selectedEmployee.custom_peripherals && selectedEmployee.custom_peripherals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-chart-4">Additional Peripherals</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-chart-4/10 rounded-lg border border-chart-4/20">
                    {selectedEmployee.custom_peripherals.map((peripheral: any, index: number) => (
                      <div key={index} className="animate-fade-in p-3 bg-background/50 rounded-md border">
                        <p className="font-medium text-foreground">{peripheral.name}</p>
                        {peripheral.model && (
                          <p className="text-sm text-muted-foreground">Model: {peripheral.model}</p>
                        )}
                        {peripheral.serial && (
                          <p className="text-sm text-muted-foreground">Serial: {peripheral.serial}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Access Permissions */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-destructive">Access Permissions</h3>
                <div className="grid grid-cols-2 gap-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">Internet Access</p>
                    <p className="font-medium">{selectedEmployee.internet_access ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="animate-fade-in">
                    <p className="text-sm font-medium text-muted-foreground">USB Access</p>
                    <p className="font-medium">{selectedEmployee.usb_access ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update employee information</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeForm
              employee={selectedEmployee}
              onSuccess={() => {
                setIsEditOpen(false);
                fetchEmployees();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEmployee} onOpenChange={() => setDeleteEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteEmployee?.name}'s record. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
