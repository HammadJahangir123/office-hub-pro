import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.jpg';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-2xl animate-fade-in">
        <div className="flex items-center justify-center gap-3">
          <img src={logo} alt="Logo" className="h-24 w-auto object-contain" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Office Support Dashboard
        </h1>
        <p className="text-xl text-muted-foreground">
          Centralized system for IT Managers to manage office devices and user information
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate('/auth')} size="lg">
            Get Started
          </Button>
          <Button onClick={() => navigate('/auth')} variant="outline" size="lg">
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
