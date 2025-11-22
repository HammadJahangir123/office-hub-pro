import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, UserX, UserCog, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  employee_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changed_by: string;
  changed_by_email: string;
  changed_by_name: string | null;
  old_data: any;
  new_data: any;
  changes: any;
  created_at: string;
}

export const ActivityLog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <UserCheck className="h-4 w-4" />;
      case 'DELETE':
        return <UserX className="h-4 w-4" />;
      case 'UPDATE':
        return <UserCog className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      INSERT: 'default',
      DELETE: 'destructive',
      UPDATE: 'secondary',
    };
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>;
  };

  const getChangeSummary = (log: AuditLog) => {
    if (log.action === 'INSERT') {
      return `Created employee: ${log.new_data?.name || 'Unknown'}`;
    }
    if (log.action === 'DELETE') {
      return `Deleted employee: ${log.old_data?.name || 'Unknown'}`;
    }
    if (log.action === 'UPDATE' && log.changes) {
      const changedFields = Object.keys(log.changes);
      return `Updated ${changedFields.length} field${changedFields.length > 1 ? 's' : ''}: ${changedFields.join(', ')}`;
    }
    return 'Updated employee record';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No activity logs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <Card key={log.id} className="hover-lift transition-all duration-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getActionIcon(log.action)}
                  <CardTitle className="text-lg">{getChangeSummary(log)}</CardTitle>
                </div>
                <CardDescription>
                  By {log.changed_by_name || log.changed_by_email} • {format(new Date(log.created_at), 'PPpp')}
                </CardDescription>
              </div>
              {getActionBadge(log.action)}
            </div>
          </CardHeader>
          {log.action === 'UPDATE' && log.changes && (
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Changes:</p>
                <div className="grid gap-2">
                  {Object.entries(log.changes).map(([field, change]: [string, any]) => (
                    <div key={field} className="text-sm bg-muted p-3 rounded-md">
                      <span className="font-medium capitalize">{field.replace(/_/g, ' ')}:</span>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-muted-foreground line-through">{change.old || 'N/A'}</span>
                        <span>→</span>
                        <span className="text-foreground font-medium">{change.new || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
