import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, UserPlus, Users } from 'lucide-react';
import { EmployeeTable } from '@/components/EmployeeTable';

const Dashboard = () => {
  const { user, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">IT Support Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? 'Admin Panel' : 'Employee Panel'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/add-employee')} variant="default">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button onClick={signOut} variant="ghost">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <EmployeeTable isAdmin={isAdmin} />
      </main>
    </div>
  );
};

export default Dashboard;
