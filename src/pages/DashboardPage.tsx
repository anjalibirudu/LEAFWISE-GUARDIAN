import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SecureImage } from '@/components/SecureImage';
import { 
  Upload, 
  History, 
  TrendingUp, 
  Leaf, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalScans: number;
  healthyPlants: number;
  diseasesDetected: number;
  pendingReview: number;
}

interface RecentPrediction {
  id: string;
  image_url: string;
  disease_name: string | null;
  crop_type: string | null;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalScans: 0,
    healthyPlants: 0,
    diseasesDetected: 0,
    pendingReview: 0,
  });
  const [recentPredictions, setRecentPredictions] = useState<RecentPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      try {
        // Fetch all predictions for stats
        const { data: predictions } = await supabase
          .from('predictions')
          .select('id, disease_name, status, image_url, crop_type, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (predictions) {
          setStats({
            totalScans: predictions.length,
            healthyPlants: predictions.filter(p => p.disease_name === 'Healthy').length,
            diseasesDetected: predictions.filter(p => p.disease_name && p.disease_name !== 'Healthy').length,
            pendingReview: predictions.filter(p => p.status === 'needs_review').length,
          });
          
          setRecentPredictions(predictions.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const statCards = [
    { 
      label: 'Total Scans', 
      value: stats.totalScans, 
      icon: TrendingUp, 
      color: 'text-primary' 
    },
    { 
      label: 'Healthy Plants', 
      value: stats.healthyPlants, 
      icon: CheckCircle, 
      color: 'text-success' 
    },
    { 
      label: 'Diseases Found', 
      value: stats.diseasesDetected, 
      icon: AlertTriangle, 
      color: 'text-warning' 
    },
    { 
      label: 'Pending Review', 
      value: stats.pendingReview, 
      icon: Clock, 
      color: 'text-info' 
    },
  ];

  const getStatusBadge = (prediction: RecentPrediction) => {
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

  return (
    <Layout showFooter={false}>
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold">
                Welcome back, {profile?.full_name?.split(' ')[0] || 'Farmer'}!
              </h1>
              <p className="text-muted-foreground mt-1">
                {role === 'farmer' && "Monitor your crops' health and detect diseases early."}
                {role === 'expert' && "Review predictions and help improve accuracy."}
                {role === 'admin' && "Manage the system and monitor performance."}
              </p>
            </div>
            <Link to="/upload">
              <Button size="lg" className="gap-2 glow-accent">
                <Upload className="w-4 h-4" />
                Analyze New Leaf
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="card-nature">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Recent Activity */}
          <Card className="card-nature">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Recent Scans
                </CardTitle>
                <CardDescription>Your latest plant analysis results</CardDescription>
              </div>
              <Link to="/history">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : recentPredictions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <Leaf className="w-12 h-12 mx-auto opacity-50" />
                  </div>
                  <p className="text-muted-foreground mb-4">No scans yet</p>
                  <Link to="/upload">
                    <Button>Upload Your First Leaf</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentPredictions.map((prediction, i) => (
                    <motion.div
                      key={prediction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link to={`/result/${prediction.id}`}>
                        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            <SecureImage 
                              imagePath={prediction.image_url} 
                              alt="Leaf scan"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium capitalize">
                                {prediction.crop_type || 'Unknown crop'}
                              </p>
                              {getStatusBadge(prediction)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(prediction.created_at).toLocaleDateString()} at{' '}
                              {new Date(prediction.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/upload">
              <Card className="card-nature hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">New Analysis</h3>
                      <p className="text-sm text-muted-foreground">Upload a leaf image</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/history">
              <Card className="card-nature hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-info/10 text-info">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">View History</h3>
                      <p className="text-sm text-muted-foreground">See all past scans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Card className="card-nature h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-success/10 text-success">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">4 Crops Supported</h3>
                    <p className="text-sm text-muted-foreground">Corn, Tomato, Potato, Wheat</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
