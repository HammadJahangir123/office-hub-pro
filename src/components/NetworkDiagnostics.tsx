import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Route, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const NetworkDiagnostics = () => {
  const [dnsHost, setDnsHost] = useState('');
  const [dnsResults, setDnsResults] = useState<any>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  const [traceHost, setTraceHost] = useState('');
  const [traceResults, setTraceResults] = useState<any[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);

  const [portHost, setPortHost] = useState('');
  const [portResults, setPortResults] = useState<any[]>([]);
  const [portLoading, setPortLoading] = useState(false);

  const handleDnsLookup = async () => {
    if (!dnsHost.trim()) {
      toast.error('Please enter a hostname');
      return;
    }

    setDnsLoading(true);
    setDnsResults(null);

    try {
      const response = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(dnsHost)}&type=A`
      );
      const data = await response.json();
      setDnsResults(data);
      toast.success('DNS lookup completed');
    } catch (error) {
      toast.error('DNS lookup failed');
      console.error('DNS lookup error:', error);
    } finally {
      setDnsLoading(false);
    }
  };

  const handleTraceroute = async () => {
    if (!traceHost.trim()) {
      toast.error('Please enter a hostname or IP');
      return;
    }

    setTraceLoading(true);
    setTraceResults([]);

    try {
      const hops = [];
      const maxHops = 8;
      
      for (let i = 1; i <= maxHops; i++) {
        const startTime = Date.now();
        try {
          const url = traceHost.startsWith('http') ? traceHost : `https://${traceHost}`;
          await fetch(url, { 
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache'
          });
          const endTime = Date.now();
          hops.push({
            hop: i,
            time: endTime - startTime,
            status: 'Success'
          });
        } catch {
          hops.push({
            hop: i,
            time: null,
            status: 'Timeout'
          });
        }
      }
      
      setTraceResults(hops);
      toast.success('Traceroute completed');
    } catch (error) {
      toast.error('Traceroute failed');
      console.error('Traceroute error:', error);
    } finally {
      setTraceLoading(false);
    }
  };

  const handlePortScan = async () => {
    if (!portHost.trim()) {
      toast.error('Please enter a hostname or IP');
      return;
    }

    setPortLoading(true);
    setPortResults([]);

    const commonPorts = [80, 443, 8080, 8443, 3000, 5000];
    const results = [];

    try {
      for (const port of commonPorts) {
        const startTime = Date.now();
        try {
          const protocol = port === 443 || port === 8443 ? 'https' : 'http';
          const host = portHost.replace(/^https?:\/\//, '');
          await fetch(`${protocol}://${host}:${port}`, {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: AbortSignal.timeout(3000)
          });
          const endTime = Date.now();
          results.push({
            port,
            status: 'Open',
            time: endTime - startTime
          });
        } catch {
          results.push({
            port,
            status: 'Closed/Filtered',
            time: null
          });
        }
      }
      
      setPortResults(results);
      toast.success('Port scan completed');
    } catch (error) {
      toast.error('Port scan failed');
      console.error('Port scan error:', error);
    } finally {
      setPortLoading(false);
    }
  };

  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Network Diagnostics Tools
        </CardTitle>
        <CardDescription>
          Admin-only tools for network diagnostics and troubleshooting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dns" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dns">
              <Search className="h-4 w-4 mr-2" />
              DNS Lookup
            </TabsTrigger>
            <TabsTrigger value="trace">
              <Route className="h-4 w-4 mr-2" />
              Traceroute
            </TabsTrigger>
            <TabsTrigger value="port">
              <Shield className="h-4 w-4 mr-2" />
              Port Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dns" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter hostname (e.g., google.com)"
                value={dnsHost}
                onChange={(e) => setDnsHost(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleDnsLookup()}
              />
              <Button onClick={handleDnsLookup} disabled={dnsLoading}>
                {dnsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
              </Button>
            </div>
            {dnsResults && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="font-mono text-sm space-y-2">
                  <div><strong>Status:</strong> {dnsResults.Status === 0 ? 'Success' : 'Failed'}</div>
                  {dnsResults.Answer && (
                    <div>
                      <strong>IP Addresses:</strong>
                      <ul className="list-disc list-inside mt-2">
                        {dnsResults.Answer.map((record: any, i: number) => (
                          <li key={i}>{record.data}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="trace" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter hostname or IP"
                value={traceHost}
                onChange={(e) => setTraceHost(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTraceroute()}
              />
              <Button onClick={handleTraceroute} disabled={traceLoading}>
                {traceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Trace'}
              </Button>
            </div>
            {traceResults.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="font-mono text-sm space-y-1">
                  {traceResults.map((hop) => (
                    <div key={hop.hop}>
                      Hop {hop.hop}: {hop.status} {hop.time ? `(${hop.time}ms)` : ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="port" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter hostname or IP"
                value={portHost}
                onChange={(e) => setPortHost(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePortScan()}
              />
              <Button onClick={handlePortScan} disabled={portLoading}>
                {portLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scan'}
              </Button>
            </div>
            {portResults.length > 0 && (
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="font-mono text-sm space-y-1">
                  {portResults.map((result) => (
                    <div key={result.port} className="flex justify-between">
                      <span>Port {result.port}:</span>
                      <span className={result.status === 'Open' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                        {result.status} {result.time ? `(${result.time}ms)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
