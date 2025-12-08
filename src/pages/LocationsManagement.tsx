import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Users, 
  Search,
  Building2
} from 'lucide-react';
import { Footer } from '@/components/Footer';
import logo from '@/assets/logo.jpg';

interface LocationData {
  location: string | null;
  count: number;
}

const LocationsManagement = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations-stats'],
    queryFn: async () => {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('location');
      
      if (error) throw error;

      // Group by location and count
      const locationMap = new Map<string, number>();
      employees?.forEach(emp => {
        const loc = emp.location || 'Unassigned';
        locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
      });

      // Convert to array and sort by count
      const locationData: LocationData[] = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count);

      return locationData;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredLocations = locations?.filter(loc => 
    (loc.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployees = locations?.reduce((sum, loc) => sum + loc.count, 0) || 0;
  const totalLocations = locations?.filter(loc => loc.location !== 'Unassigned').length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card animate-fade-in shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
              <div className="flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Locations Management</h1>
                  <p className="text-sm text-muted-foreground">View employee distribution by location</p>
                </div>
              </div>
            </div>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="hover-scale">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in-up flex-1">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="overflow-hidden hover-lift animate-fade-in border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Locations</p>
                  <h3 className="text-3xl font-bold text-foreground">{totalLocations}</h3>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 p-3 rounded-lg animate-glow">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden hover-lift animate-fade-in border-border/50" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Employees</p>
                  <h3 className="text-3xl font-bold text-foreground">{totalEmployees}</h3>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-lg animate-glow">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              All Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations?.map((loc, index) => (
                  <Card 
                    key={loc.location || 'unassigned'} 
                    className="hover-lift cursor-pointer transition-all duration-200 hover:border-primary/50"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/dashboard?location=${encodeURIComponent(loc.location || '')}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${loc.location === 'Unassigned' ? 'bg-muted' : 'bg-primary/10'}`}>
                            <MapPin className={`h-4 w-4 ${loc.location === 'Unassigned' ? 'text-muted-foreground' : 'text-primary'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{loc.location || 'Unassigned'}</p>
                            <p className="text-sm text-muted-foreground">
                              {loc.count} {loc.count === 1 ? 'employee' : 'employees'}
                            </p>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-primary">{loc.count}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {filteredLocations?.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                No locations found matching your search.
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default LocationsManagement;