import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SecureImage } from '@/components/SecureImage';
import { 
  History, 
  Search, 
  Filter,
  Upload,
  Leaf,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';

interface Prediction {
  id: string;
  image_url: string;
  crop_type: string | null;
  disease_name: string | null;
  confidence_score: number | null;
  status: string;
  created_at: string;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [filteredPredictions, setFilteredPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('predictions')
          .select('id, image_url, crop_type, disease_name, confidence_score, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setPredictions(data || []);
        setFilteredPredictions(data || []);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [user]);

  useEffect(() => {
    let filtered = [...predictions];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.disease_name?.toLowerCase().includes(term) ||
        p.crop_type?.toLowerCase().includes(term)
      );
    }
    
    if (cropFilter !== 'all') {
      filtered = filtered.filter(p => p.crop_type === cropFilter);
    }
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'healthy') {
        filtered = filtered.filter(p => p.disease_name === 'Healthy');
      } else if (statusFilter === 'diseased') {
        filtered = filtered.filter(p => p.disease_name && p.disease_name !== 'Healthy');
      } else if (statusFilter === 'failed') {
        filtered = filtered.filter(p => p.status === 'failed');
      }
    }
    
    setFilteredPredictions(filtered);
  }, [searchTerm, cropFilter, statusFilter, predictions]);

  const getStatusIcon = (prediction: Prediction) => {
    if (prediction.status === 'pending') {
      return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
    if (prediction.status === 'failed') {
      return <XCircle className="w-4 h-4 text-destructive" />;
    }
    if (prediction.disease_name === 'Healthy') {
      return <CheckCircle className="w-4 h-4 text-success" />;
    }
    return <AlertTriangle className="w-4 h-4 text-warning" />;
  };

  const getStatusBadge = (prediction: Prediction) => {
    if (prediction.status === 'pending') {
      return <Badge variant="outline">Processing</Badge>;
    }
    if (prediction.status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (prediction.disease_name === 'Healthy') {
      return <Badge className="bg-success text-success-foreground">Healthy</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning-foreground">{prediction.disease_name}</Badge>;
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold flex items-center gap-2">
                <History className="w-8 h-8 text-primary" />
                Analysis History
              </h1>
              <p className="text-muted-foreground mt-1">
                View all your past plant disease analyses
              </p>
            </div>
            <Link to="/upload">
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                New Analysis
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <Card className="card-nature">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by disease or crop..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={cropFilter} onValueChange={setCropFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by crop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Crops</SelectItem>
                    <SelectItem value="corn">Corn</SelectItem>
                    <SelectItem value="tomato">Tomato</SelectItem>
                    <SelectItem value="potato">Potato</SelectItem>
                    <SelectItem value="wheat">Wheat</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="diseased">Diseased</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="text-center py-12">
              <div className="pulse-leaf text-primary mb-4">
                <Leaf className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : filteredPredictions.length === 0 ? (
            <Card className="card-nature">
              <CardContent className="py-12 text-center">
                <div className="text-muted-foreground mb-4">
                  <Leaf className="w-16 h-16 mx-auto opacity-50" />
                </div>
                {predictions.length === 0 ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No analyses yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by uploading your first plant leaf image
                    </p>
                    <Link to="/upload">
                      <Button>Upload Your First Leaf</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPredictions.map((prediction, i) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/result/${prediction.id}`}>
                    <Card className="card-nature hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                      <CardContent className="p-0">
                        <div className="aspect-video relative overflow-hidden rounded-t-xl bg-muted">
                          <SecureImage 
                            imagePath={prediction.image_url} 
                            alt="Leaf analysis"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2">
                            {getStatusBadge(prediction)}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(prediction)}
                            <span className="font-medium capitalize">
                              {prediction.crop_type || 'Unknown'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(prediction.created_at).toLocaleDateString()} at{' '}
                            {new Date(prediction.created_at).toLocaleTimeString()}
                          </p>
                          {prediction.confidence_score && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Confidence: {(prediction.confidence_score * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Stats summary */}
          {predictions.length > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Showing {filteredPredictions.length} of {predictions.length} analyses
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
