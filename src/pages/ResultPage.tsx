import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SecureImage } from '@/components/SecureImage';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Leaf, 
  Pill, 
  Sprout, 
  Shield,
  ArrowLeft,
  Upload,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { toast } from 'sonner';

interface Prediction {
  id: string;
  image_url: string;
  crop_type: string | null;
  disease_name: string | null;
  confidence_score: number | null;
  status: string;
  is_valid_leaf: boolean | null;
  error_message: string | null;
  created_at: string;
}

interface Advisory {
  description: string;
  chemical_treatment: string | null;
  organic_remedies: string | null;
  prevention_steps: string | null;
  dosage_info: string | null;
  severity: string | null;
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchResult = async () => {
      try {
        // Fetch prediction
        const { data: predData, error: predError } = await supabase
          .from('predictions')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (predError) throw predError;
        setPrediction(predData);
        
        // Fetch advisory if disease detected
        if (predData.crop_type && predData.disease_name) {
          const { data: advData } = await supabase
            .from('disease_advisories')
            .select('description, chemical_treatment, organic_remedies, prevention_steps, dosage_info, severity')
            .eq('crop_type', predData.crop_type)
            .eq('disease_name', predData.disease_name)
            .single();
          
          if (advData) {
            setAdvisory(advData);
          }
        }
      } catch (error) {
        console.error('Error fetching result:', error);
        toast.error('Failed to load result');
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [id, user, navigate]);

  const submitFeedback = async (isCorrect: boolean) => {
    if (!prediction || !user || feedbackSubmitted) return;
    
    try {
      const { error } = await supabase
        .from('prediction_feedback')
        .insert({
          prediction_id: prediction.id,
          user_id: user.id,
          is_correct: isCorrect,
        });
      
      if (error) throw error;
      
      setFeedbackSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const getSeverityStyle = (severity: string | null) => {
    switch (severity) {
      case 'low': return 'severity-low';
      case 'medium': return 'severity-medium';
      case 'high': return 'severity-high';
      case 'critical': return 'severity-critical';
      default: return '';
    }
  };

  const getStatusIcon = () => {
    if (!prediction) return null;
    
    if (prediction.status === 'failed' || !prediction.is_valid_leaf) {
      return <XCircle className="w-6 h-6 text-destructive" />;
    }
    if (prediction.disease_name === 'Healthy') {
      return <CheckCircle className="w-6 h-6 text-success" />;
    }
    return <AlertTriangle className="w-6 h-6 text-warning" />;
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="container py-12 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="pulse-leaf text-primary mb-4">
              <Leaf className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-muted-foreground">Loading analysis results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!prediction) {
    return (
      <Layout showFooter={false}>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Result not found</h1>
          <Link to="/history">
            <Button>View History</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isError = prediction.status === 'failed' || prediction.is_valid_leaf === false;
  const isHealthy = prediction.disease_name === 'Healthy';

  return (
    <Layout showFooter={false}>
      <div className="container py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          {/* Main result card */}
          <Card className={`card-nature result-card ${isError ? 'border-destructive/50' : isHealthy ? 'border-success/50' : 'border-warning/50'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div>
                    <CardTitle className="text-xl">
                      {isError 
                        ? 'Analysis Failed' 
                        : isHealthy 
                          ? 'Plant is Healthy!' 
                          : 'Disease Detected'
                      }
                    </CardTitle>
                    <CardDescription>
                      {new Date(prediction.created_at).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
                {prediction.confidence_score && (
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {(prediction.confidence_score * 100).toFixed(1)}% confidence
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image and Result */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-xl overflow-hidden bg-muted">
                  <SecureImage 
                    imagePath={prediction.image_url} 
                    alt="Analyzed leaf"
                    className="w-full h-auto object-contain max-h-[300px]"
                  />
                </div>
                
                <div className="space-y-4">
                  {isError ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                      <h3 className="font-semibold text-destructive mb-2">Analysis Failed</h3>
                      <p className="text-sm text-muted-foreground">
                        {prediction.error_message || 'Please upload a clear plant leaf image for analysis.'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Detected Crop</p>
                        <p className="text-lg font-semibold capitalize">
                          {prediction.crop_type || 'Unknown'}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Diagnosis</p>
                        <p className="text-lg font-semibold">
                          {prediction.disease_name || 'Unknown'}
                        </p>
                      </div>
                      {advisory?.severity && (
                        <div className={`p-4 rounded-lg border ${getSeverityStyle(advisory.severity)}`}>
                          <p className="text-sm mb-1">Severity Level</p>
                          <p className="font-semibold capitalize">{advisory.severity}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Advisory Section */}
              {advisory && !isError && (
                <>
                  <Separator />
                  
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-primary" />
                      Disease Information
                    </h3>
                    <p className="text-muted-foreground">{advisory.description}</p>
                    
                    {advisory.chemical_treatment && (
                      <div className="p-4 rounded-lg bg-info/5 border border-info/20">
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-info" />
                          Chemical Treatment
                        </h4>
                        <p className="text-sm text-muted-foreground">{advisory.chemical_treatment}</p>
                        {advisory.dosage_info && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Dosage:</strong> {advisory.dosage_info}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {advisory.organic_remedies && (
                      <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Sprout className="w-4 h-4 text-success" />
                          Organic Remedies
                        </h4>
                        <p className="text-sm text-muted-foreground">{advisory.organic_remedies}</p>
                      </div>
                    )}
                    
                    {advisory.prevention_steps && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-primary" />
                          Prevention Steps
                        </h4>
                        <p className="text-sm text-muted-foreground">{advisory.prevention_steps}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Feedback Section */}
              {!isError && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Was this analysis helpful?</p>
                    <p className="text-sm text-muted-foreground">
                      Your feedback helps improve our AI
                    </p>
                  </div>
                  {feedbackSubmitted ? (
                    <Badge variant="outline" className="gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Thanks for your feedback!
                    </Badge>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => submitFeedback(true)}
                        className="gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Yes
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => submitFeedback(false)}
                        className="gap-2"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        No
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Link to="/upload" className="flex-1">
                  <Button className="w-full gap-2">
                    <Upload className="w-4 h-4" />
                    Analyze Another Leaf
                  </Button>
                </Link>
                <Link to="/history" className="flex-1">
                  <Button variant="outline" className="w-full">
                    View History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
