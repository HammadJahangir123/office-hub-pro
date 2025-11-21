import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, UserPlus, Database, Users, Shield } from 'lucide-react';
import { EmployeeTable } from '@/components/EmployeeTable';
import { Footer } from '@/components/Footer';
import logo from '@/assets/logo.jpg';

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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card animate-fade-in shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-auto object-contain animate-float" />
              <div className="flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">IT Support Dashboard</h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {isAdmin ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {isAdmin ? 'Admin Panel' : 'Employee Panel'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => navigate('/add-employee')} variant="default" className="hover-scale">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button onClick={signOut} variant="ghost" className="hover-scale">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in-up flex-1">
        <EmployeeTable isAdmin={isAdmin} />
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
