import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CustomPeripheral {
  id: string;
  name: string;
  model: string;
  serial: string;
  [key: string]: string; // Add index signature for Json compatibility
}

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address').max(255),
  department: z.string().min(2, 'Department is required').max(100),
  section: z.string().min(2, 'Section is required').max(100),
  location: z.string().max(100).optional(),
  computer_name: z.string().max(100).optional(),
  computer_serial: z.string().max(100).optional(),
  ip_address: z.string().max(15).optional(),
  specs: z.string().max(500).optional(),
  led_model: z.string().max(100).optional(),
  led_serial: z.string().max(100).optional(),
  printer_model: z.string().max(100).optional(),
  printer_serial: z.string().max(100).optional(),
  scanner_model: z.string().max(100).optional(),
  scanner_serial: z.string().max(100).optional(),
  keyboard: z.string().max(100).optional(),
  mouse: z.string().max(100).optional(),
  internet_access: z.boolean(),
  usb_access: z.boolean(),
  last_pm: z.string().optional(),
  extension_number: z.string().max(20).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  employee?: any;
  onSuccess?: () => void;
}

export const EmployeeForm = ({ employee, onSuccess }: EmployeeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customPeripherals, setCustomPeripherals] = useState<CustomPeripheral[]>(
    employee?.custom_peripherals || []
  );
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee || {
      internet_access: true,
      usb_access: true,
    },
  });

  const internetAccess = watch('internet_access');
  const usbAccess = watch('usb_access');

  const addCustomPeripheral = () => {
    setCustomPeripherals([
      ...customPeripherals,
      { id: crypto.randomUUID(), name: '', model: '', serial: '' }
    ]);
  };

  const removeCustomPeripheral = (id: string) => {
    setCustomPeripherals(customPeripherals.filter(p => p.id !== id));
  };

  const updateCustomPeripheral = (id: string, field: keyof Omit<CustomPeripheral, 'id'>, value: string) => {
    setCustomPeripherals(customPeripherals.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Filter custom peripherals to only include items with at least a name
      const validPeripherals = customPeripherals.filter(p => p.name.trim() !== '');

      if (employee?.id) {
        // Get user profile for notification
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update({ ...data, custom_peripherals: validPeripherals })
          .eq('id', employee.id);

        if (error) throw error;
        toast.success('Employee updated successfully');

        // Send notification email to admins
        try {
          await supabase.functions.invoke('send-employee-update-notification', {
            body: {
              employeeName: data.name,
              employeeDepartment: data.department,
              employeeSection: data.section,
              changedBy: profile?.full_name || user.email || 'Unknown User',
              changedByEmail: profile?.email || user.email || 'unknown@email.com',
              oldData: employee,
              newData: data,
            },
          });
        } catch (emailError) {
          console.error('Failed to send notification:', emailError);
          // Don't show error to user as the update was successful
        }
      } else {
        // Create new employee
        const employeeData: any = {
          ...data,
          created_by: user.id,
          custom_peripherals: validPeripherals,
        };
        
        const { error } = await supabase
          .from('employees')
          .insert(employeeData);

        if (error) throw error;
        toast.success('Employee added successfully');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic employee details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" {...register('username')} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Input id="department" {...register('department')} />
            {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Section *</Label>
            <Input id="section" {...register('section')} />
            {errors.section && <p className="text-sm text-destructive">{errors.section.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="extension_number">Extension Number</Label>
            <Input id="extension_number" {...register('extension_number')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} placeholder="e.g., Kashmir Road" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Computer Information</CardTitle>
          <CardDescription>Desktop/Laptop details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="computer_name">Computer Name</Label>
            <Input id="computer_name" {...register('computer_name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="computer_serial">Computer Serial Number</Label>
            <Input id="computer_serial" {...register('computer_serial')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip_address">IP Address</Label>
            <Input id="ip_address" {...register('ip_address')} placeholder="192.168.1.1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_pm">Last Preventive Maintenance</Label>
            <Input id="last_pm" type="date" {...register('last_pm')} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="specs">Specifications</Label>
            <Input id="specs" {...register('specs')} placeholder="CPU, RAM, Storage, etc." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peripherals</CardTitle>
          <CardDescription>Monitor, printer, and other devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="led_model">Monitor/LED Model</Label>
              <Input id="led_model" {...register('led_model')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="led_serial">Monitor Serial Number</Label>
              <Input id="led_serial" {...register('led_serial')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printer_model">Printer Model</Label>
              <Input id="printer_model" {...register('printer_model')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="printer_serial">Printer Serial Number</Label>
              <Input id="printer_serial" {...register('printer_serial')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scanner_model">Scanner Model</Label>
              <Input id="scanner_model" {...register('scanner_model')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scanner_serial">Scanner Serial Number</Label>
              <Input id="scanner_serial" {...register('scanner_serial')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyboard">Keyboard</Label>
              <Input id="keyboard" {...register('keyboard')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mouse">Mouse</Label>
              <Input id="mouse" {...register('mouse')} />
            </div>
          </div>

          {/* Custom Peripherals Section - Admin Only */}
          {isAdmin && (
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Additional Peripherals</h4>
                  <p className="text-xs text-muted-foreground">Add custom peripheral devices</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addCustomPeripheral}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              {customPeripherals.map((peripheral) => (
                <div key={peripheral.id} className="grid gap-3 md:grid-cols-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Device Name</Label>
                    <Input 
                      placeholder="e.g., Webcam"
                      value={peripheral.name}
                      onChange={(e) => updateCustomPeripheral(peripheral.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input 
                      placeholder="Model number"
                      value={peripheral.model}
                      onChange={(e) => updateCustomPeripheral(peripheral.id, 'model', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Serial Number</Label>
                    <Input 
                      placeholder="Serial number"
                      value={peripheral.serial}
                      onChange={(e) => updateCustomPeripheral(peripheral.id, 'serial', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon"
                      onClick={() => removeCustomPeripheral(peripheral.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Permissions</CardTitle>
          <CardDescription>Internet and USB access settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="internet_access" className="cursor-pointer">
              Internet Access
            </Label>
            <Switch
              id="internet_access"
              checked={internetAccess}
              onCheckedChange={(checked) => setValue('internet_access', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="usb_access" className="cursor-pointer">
              USB Access
            </Label>
            <Switch
              id="usb_access"
              checked={usbAccess}
              onCheckedChange={(checked) => setValue('usb_access', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {employee ? 'Update Employee' : 'Add Employee'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate('/dashboard')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};
