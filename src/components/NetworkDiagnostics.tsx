import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Gauge, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export const NetworkDiagnostics = () => {
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [jitter, setJitter] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const measureLatency = async (): Promise<number[]> => {
    const latencies: number[] = [];
    const testUrl = 'https://www.google.com/favicon.ico';
    
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      try {
        await fetch(testUrl, { cache: 'no-cache', mode: 'no-cors' });
        const end = performance.now();
        latencies.push(end - start);
      } catch {
        latencies.push(0);
      }
    }
    return latencies;
  };

  const calculateJitter = (latencies: number[]): number => {
    if (latencies.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < latencies.length; i++) {
      sum += Math.abs(latencies[i] - latencies[i - 1]);
    }
    return sum / (latencies.length - 1);
  };

  const testDownloadSpeed = async (): Promise<number> => {
    const testFile = 'https://via.placeholder.com/1000x1000.jpg';
    const startTime = performance.now();
    
    try {
      const response = await fetch(testFile + '?t=' + Date.now(), { cache: 'no-cache' });
      const blob = await response.blob();
      const endTime = performance.now();
      
      const durationSeconds = (endTime - startTime) / 1000;
      const sizeInBits = blob.size * 8;
      const speedMbps = (sizeInBits / durationSeconds) / (1024 * 1024);
      
      return speedMbps;
    } catch {
      return 0;
    }
  };

  const testUploadSpeed = async (): Promise<number> => {
    const data = new Blob([new ArrayBuffer(100000)]);
    const startTime = performance.now();
    
    try {
      await fetch('https://httpbin.org/post', {
        method: 'POST',
        body: data,
        cache: 'no-cache'
      });
      const endTime = performance.now();
      
      const durationSeconds = (endTime - startTime) / 1000;
      const sizeInBits = data.size * 8;
      const speedMbps = (sizeInBits / durationSeconds) / (1024 * 1024);
      
      return speedMbps;
    } catch {
      return 0;
    }
  };

  const runFullTest = async () => {
    setTesting(true);
    setProgress(0);
    setDownloadSpeed(null);
    setUploadSpeed(null);
    setLatency(null);
    setJitter(null);

    try {
      // Test latency and jitter
      setProgress(25);
      const latencies = await measureLatency();
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const calculatedJitter = calculateJitter(latencies);
      setLatency(avgLatency);
      setJitter(calculatedJitter);

      // Test download speed
      setProgress(50);
      const dlSpeed = await testDownloadSpeed();
      setDownloadSpeed(dlSpeed);

      // Test upload speed
      setProgress(75);
      const upSpeed = await testUploadSpeed();
      setUploadSpeed(upSpeed);

      setProgress(100);
      toast.success('Speed test completed');
    } catch (error) {
      toast.error('Speed test failed');
      console.error('Speed test error:', error);
    } finally {
      setTesting(false);
    }
  };


  return (
    <Card className="animate-fade-in-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Network Speed Testing
        </CardTitle>
        <CardDescription>
          Admin-only tools for bandwidth and network speed measurement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-center">
            <Button 
              onClick={runFullTest} 
              disabled={testing}
              size="lg"
              className="hover-scale"
            >
              {testing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Run Speed Test
                </>
              )}
            </Button>
          </div>

          {testing && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Testing in progress... {progress}%
              </p>
            </div>
          )}

          {(downloadSpeed !== null || uploadSpeed !== null || latency !== null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" />
                    Download Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {downloadSpeed !== null ? downloadSpeed.toFixed(2) : '--'}
                    <span className="text-lg text-muted-foreground ml-2">Mbps</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Upload Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {uploadSpeed !== null ? uploadSpeed.toFixed(2) : '--'}
                    <span className="text-lg text-muted-foreground ml-2">Mbps</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Latency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {latency !== null ? latency.toFixed(2) : '--'}
                    <span className="text-lg text-muted-foreground ml-2">ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Jitter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {jitter !== null ? jitter.toFixed(2) : '--'}
                    <span className="text-lg text-muted-foreground ml-2">ms</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
