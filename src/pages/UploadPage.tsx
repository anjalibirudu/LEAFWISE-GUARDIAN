import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Image, X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const SUPPORTED_CROPS = ['corn', 'tomato', 'potato', 'wheat'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
  };

  const handleSubmit = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setProgress(10);
    
    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      setProgress(30);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('leaf-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      setProgress(50);
      
      // Store the file path (not a full URL) for secure signed URL generation on-demand
      // This is more secure as it doesn't expose URL patterns and works with private buckets
      setProgress(60);
      
      // Create prediction record with file path instead of public URL
      const { data: prediction, error: predictionError } = await supabase
        .from('predictions')
        .insert({
          user_id: user.id,
          image_url: fileName, // Store path only, generate signed URLs when needed
          status: 'pending',
        })
        .select()
        .single();
      
      if (predictionError) throw predictionError;
      
      setProgress(70);
      setUploading(false);
      setAnalyzing(true);
      
      // Call prediction API (edge function) - pass file path, edge function will generate signed URL
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-leaf', {
        body: { 
          predictionId: prediction.id,
          imagePath: fileName // Pass file path, edge function generates signed URL
        },
      });
      
      setProgress(100);
      
      if (analysisError) {
        // Update prediction with error
        await supabase
          .from('predictions')
          .update({ 
            status: 'failed', 
            error_message: analysisError.message 
          })
          .eq('id', prediction.id);
        
        throw analysisError;
      }
      
      toast.success('Analysis complete!');
      navigate(`/result/${prediction.id}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze image';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <Layout showFooter={false}>
      <div className="container py-12 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold mb-2">
              Analyze Plant Leaf
            </h1>
            <p className="text-muted-foreground">
              Upload a clear photo of a plant leaf for disease detection
            </p>
          </div>

          <Card className="card-nature">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Supports corn, tomato, potato, and wheat leaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`upload-zone flex flex-col items-center justify-center min-h-[300px] cursor-pointer ${
                    dragOver ? 'dragover' : ''
                  }`}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  />
                  <div className="text-primary mb-4">
                    <Image className="w-16 h-16 opacity-50" />
                  </div>
                  <p className="text-lg font-medium mb-2">Drop your image here</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-muted">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-auto max-h-[400px] object-contain mx-auto"
                    />
                    {!uploading && !analyzing && (
                      <button
                        onClick={clearFile}
                        className="absolute top-3 right-3 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {(uploading || analyzing) && (
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-center text-muted-foreground">
                        {uploading ? 'Uploading...' : 'Analyzing image...'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Important Notice */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning-foreground mb-1">Important</p>
                  <p className="text-muted-foreground">
                    Please upload a clear image of a plant leaf only. 
                    Non-leaf images will be rejected. Supported crops: 
                    corn, tomato, potato, and wheat.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!file || uploading || analyzing}
                className="w-full"
                size="lg"
              >
                {uploading || analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? 'Uploading...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Analyze Leaf
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

        </motion.div>
      </div>
    </Layout>
  );
}
