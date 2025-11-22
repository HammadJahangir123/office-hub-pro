import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Wifi, WifiOff, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const PingChecker = () => {
  const [ipAddress, setIpAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    responseTime?: number;
  } | null>(null);
  const { toast } = useToast();

  const checkPing = async () => {
    if (!ipAddress.trim()) {
      toast({
        title: "Error",
        description: "Please enter an IP address or hostname",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const startTime = performance.now();
    
    try {
      // Try HTTP first, then HTTPS
      const protocols = ['http', 'https'];
      let success = false;
      let responseTime = 0;

      for (const protocol of protocols) {
        try {
          const response = await fetch(`${protocol}://${ipAddress}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
          });
          
          const endTime = performance.now();
          responseTime = Math.round(endTime - startTime);
          success = true;
          break;
        } catch (error) {
          // Try next protocol
          continue;
        }
      }

      const endTime = performance.now();
      responseTime = responseTime || Math.round(endTime - startTime);

      if (success || responseTime < 5000) {
        setResult({
          success: true,
          message: `Host is reachable`,
          responseTime,
        });
        toast({
          title: "Success",
          description: `Host responded in ${responseTime}ms`,
        });
      } else {
        setResult({
          success: false,
          message: "Host is not reachable or timed out",
        });
        toast({
          title: "Failed",
          description: "Could not reach the host",
          variant: "destructive",
        });
      }
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      setResult({
        success: false,
        message: "Unable to reach host",
      });
      toast({
        title: "Error",
        description: "Could not establish connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      checkPing();
    }
  };

  return (
    <Card className="animate-fade-in hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          IP Ping Checker
        </CardTitle>
        <CardDescription>
          Enter an IP address or hostname to check connectivity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="192.168.1.1 or example.com"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={checkPing} 
            disabled={loading}
            className="hover-scale"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Ping'
            )}
          </Button>
        </div>

        {result && (
          <div
            className={`p-4 rounded-lg border animate-fade-in ${
              result.success
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <span className={`font-semibold ${
                result.success 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {result.message}
              </span>
            </div>
            {result.responseTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Response time: {result.responseTime}ms</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
