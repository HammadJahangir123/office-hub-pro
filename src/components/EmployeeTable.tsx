import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import { Download, Edit, Eye, Loader2, Search, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  username: string;
  email: string;
  department: string;
  section: string;
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
      
      // Extract unique departments
      const uniqueDepts = [...new Set(data?.map(e => e.department) || [])];
      setDepartments(uniqueDepts);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(e => e.department === departmentFilter);
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

      toast.success('Employee deleted successfully');
      fetchEmployees();
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
          <CardTitle>Search & Filter</CardTitle>
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
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
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
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
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
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Extension</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
              <TableRow key={employee.id} className="transition-all duration-200 hover:bg-accent/50">
                <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.section}</TableCell>
                      <TableCell>{employee.ip_address || '-'}</TableCell>
                      <TableCell>{employee.extension_number || '-'}</TableCell>
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
            <DialogTitle className="text-2xl gradient-text">Employee Details</DialogTitle>
            <DialogDescription>Complete information for {selectedEmployee?.name}</DialogDescription>
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
