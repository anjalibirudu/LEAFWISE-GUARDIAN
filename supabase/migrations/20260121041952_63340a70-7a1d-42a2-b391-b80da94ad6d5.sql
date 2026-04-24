-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'expert', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (CRITICAL: separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'farmer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create crops enum
CREATE TYPE public.crop_type AS ENUM ('corn', 'tomato', 'potato', 'wheat');

-- Create prediction status enum
CREATE TYPE public.prediction_status AS ENUM ('pending', 'completed', 'failed', 'needs_review');

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  crop_type crop_type,
  disease_name TEXT,
  confidence_score DECIMAL(5,4),
  status prediction_status NOT NULL DEFAULT 'pending',
  is_valid_leaf BOOLEAN DEFAULT NULL,
  error_message TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disease_advisories table
CREATE TABLE public.disease_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type crop_type NOT NULL,
  disease_name TEXT NOT NULL,
  description TEXT NOT NULL,
  chemical_treatment TEXT,
  organic_remedies TEXT,
  prevention_steps TEXT,
  dosage_info TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (crop_type, disease_name)
);

-- Create prediction_feedback table for retraining
CREATE TABLE public.prediction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID REFERENCES public.predictions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_correct BOOLEAN NOT NULL,
  correct_disease TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_feedback ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role on signup"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Predictions policies
CREATE POLICY "Users can view own predictions"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON public.predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Experts can view predictions needing review"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'expert') AND status = 'needs_review');

CREATE POLICY "Experts can update reviewed predictions"
  ON public.predictions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'expert'));

CREATE POLICY "Admins can view all predictions"
  ON public.predictions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Disease advisories policies (public read)
CREATE POLICY "Anyone can view advisories"
  ON public.disease_advisories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage advisories"
  ON public.disease_advisories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prediction feedback policies
CREATE POLICY "Users can submit feedback on own predictions"
  ON public.prediction_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
  ON public.prediction_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON public.prediction_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disease_advisories_updated_at
  BEFORE UPDATE ON public.disease_advisories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for leaf images
INSERT INTO storage.buckets (id, name, public)
VALUES ('leaf-images', 'leaf-images', true);

-- Storage policies for leaf images
CREATE POLICY "Users can upload leaf images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'leaf-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own leaf images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'leaf-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view leaf images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'leaf-images');

-- Insert seed data for disease advisories
INSERT INTO public.disease_advisories (crop_type, disease_name, description, chemical_treatment, organic_remedies, prevention_steps, dosage_info, severity) VALUES
('corn', 'Northern Corn Leaf Blight', 'Fungal disease causing long, elliptical gray-green lesions on leaves.', 'Apply fungicides containing azoxystrobin or propiconazole', 'Use neem oil spray, crop rotation with non-host plants', 'Plant resistant hybrids, remove infected debris, avoid overhead irrigation', 'Azoxystrobin: 6-12 oz/acre at first symptoms', 'medium'),
('corn', 'Common Rust', 'Fungal disease producing small, reddish-brown pustules on leaves.', 'Fungicides with mancozeb or chlorothalonil', 'Garlic extract spray, baking soda solution', 'Plant resistant varieties, early planting, balanced fertilization', 'Mancozeb: 1.5-2 lb/acre every 7-14 days', 'low'),
('corn', 'Gray Leaf Spot', 'Rectangular lesions with tan centers and dark brown margins.', 'Strobilurin-based fungicides', 'Copper-based organic fungicides', 'Tillage to bury residue, crop rotation, resistant hybrids', 'Apply at VT stage, repeat in 14 days if needed', 'high'),
('corn', 'Healthy', 'No disease detected. Plant appears healthy.', NULL, NULL, 'Continue regular monitoring and good agricultural practices', NULL, 'low'),
('tomato', 'Early Blight', 'Dark spots with concentric rings on lower leaves, spreading upward.', 'Chlorothalonil or copper-based fungicides', 'Copper sulfate, neem oil, baking soda spray', 'Mulching, proper spacing, avoid wetting foliage, stake plants', 'Chlorothalonil: 1.5-2 pt/acre every 7-10 days', 'medium'),
('tomato', 'Late Blight', 'Water-soaked spots that turn brown, white mold on undersides.', 'Mefenoxam or phosphorous acid fungicides', 'Copper hydroxide spray, compost tea', 'Remove infected plants, improve air circulation, avoid overhead watering', 'Apply preventatively before disease onset', 'critical'),
('tomato', 'Septoria Leaf Spot', 'Small circular spots with dark borders and tan centers.', 'Copper-based or mancozeb fungicides', 'Neem oil, bicarbonate sprays', 'Remove lower leaves, proper spacing, drip irrigation', 'Begin at first sign, repeat every 7-10 days', 'medium'),
('tomato', 'Leaf Mold', 'Pale green to yellow spots on upper leaf surface.', 'Chlorothalonil-based products', 'Improve ventilation, reduce humidity', 'Resistant varieties, proper greenhouse ventilation', 'Apply at first symptoms', 'low'),
('tomato', 'Healthy', 'No disease detected. Plant appears healthy.', NULL, NULL, 'Maintain regular watering, fertilization, and pest monitoring', NULL, 'low'),
('potato', 'Early Blight', 'Brown to black lesions with concentric rings on leaves.', 'Mancozeb or chlorothalonil fungicides', 'Copper-based sprays, compost tea', 'Crop rotation, remove infected debris, balanced nutrition', 'Start when plants are 6 inches tall, repeat weekly', 'medium'),
('potato', 'Late Blight', 'Water-soaked lesions that turn brown, white growth on undersides.', 'Fluopicolide or mandipropamid', 'Copper hydroxide, destroy infected plants', 'Plant certified seed, good drainage, destroy volunteers', 'Apply before disease appears in wet conditions', 'critical'),
('potato', 'Blackleg', 'Black rot at stem base, yellowing and wilting of leaves.', 'No effective chemical control', 'Remove and destroy infected plants, use certified seed', 'Plant in well-drained soil, avoid overwatering', 'Prevention is key - no curative treatment', 'high'),
('potato', 'Healthy', 'No disease detected. Plant appears healthy.', NULL, NULL, 'Regular hilling, proper irrigation, monitor for pests', NULL, 'low'),
('wheat', 'Leaf Rust', 'Orange-red pustules on leaves, reducing photosynthesis.', 'Propiconazole or tebuconazole fungicides', 'Resistant varieties, crop rotation', 'Plant resistant cultivars, balanced fertilization', 'Apply at first sign of disease', 'medium'),
('wheat', 'Powdery Mildew', 'White powdery coating on leaves and stems.', 'Sulfur-based or triazole fungicides', 'Neem oil, milk spray solution', 'Resistant varieties, proper plant spacing, reduce nitrogen', 'Apply when pustules first appear', 'medium'),
('wheat', 'Septoria Tritici Blotch', 'Tan lesions with dark borders on leaves.', 'Azoxystrobin or epoxiconazole', 'Crop rotation, resistant varieties', 'Destroy crop residue, rotate crops, use treated seed', 'Apply at flag leaf emergence', 'high'),
('wheat', 'Healthy', 'No disease detected. Plant appears healthy.', NULL, NULL, 'Continue crop monitoring and timely harvesting', NULL, 'low');