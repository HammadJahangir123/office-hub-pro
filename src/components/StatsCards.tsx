import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Building2, UserPlus, Loader2 } from 'lucide-react';

export const StatsCards = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['employee-stats'],
    queryFn: async () => {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('department, created_at');
      
      if (error) throw error;

      const total = employees?.length || 0;
      const departments = new Set(employees?.map(e => e.department)).size;
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = employees?.filter(e => 
        new Date(e.created_at) >= sevenDaysAgo
      ).length || 0;

      return { total, departments, recent };
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.total || 0,
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Departments',
      value: stats?.departments || 0,
      icon: Building2,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Recent Additions',
      value: stats?.recent || 0,
      icon: UserPlus,
      gradient: 'from-green-500 to-emerald-500',
      subtitle: 'Last 7 days',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="overflow-hidden hover-lift animate-fade-in border-border/50"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {stat.title}
                  </p>
                  <h3 className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </h3>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  )}
                </div>
                <div className={`bg-gradient-to-br ${stat.gradient} p-3 rounded-lg animate-glow`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
