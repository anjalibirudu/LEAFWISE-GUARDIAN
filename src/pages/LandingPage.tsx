import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { LeafIcon } from '@/components/ui/LeafIcon';
import { useAuth } from '@/lib/auth';
import { 
  Upload, 
  Brain, 
  Stethoscope, 
  BookOpen,
  History,
  Users,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  ScanLine,
  FileText,
  ShieldCheck
} from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Easy Upload',
    description: 'Simply drag and drop or click to upload your plant leaf image. We support all common image formats.',
  },
  {
    icon: Brain,
    title: 'Advanced Analysis',
    description: 'Powered by RBN, Fuzzy Logic, HoG feature extraction, and DBN deep learning algorithms for precise detection.',
  },
  {
    icon: Stethoscope,
    title: 'Disease Detection',
    description: 'Identify common crop diseases with detailed symptom analysis and confidence scores.',
  },
  {
    icon: BookOpen,
    title: 'Treatment Advisory',
    description: 'Get comprehensive treatment guidelines including chemical, organic remedies and prevention steps.',
  },
  {
    icon: History,
    title: 'History Tracking',
    description: 'Keep track of all your past diagnoses and monitor your crop health over time.',
  },
  {
    icon: Users,
    title: 'Expert Review',
    description: 'Low-confidence predictions are reviewed by agricultural experts for accurate results.',
  },
];

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload Image',
    description: 'Take a photo or upload an image of your crop\'s leaf showing symptoms.',
  },
  {
    number: '02',
    icon: ScanLine,
    title: 'Analysis',
    description: 'Our vision system validates the image and identifies potential diseases.',
  },
  {
    number: '03',
    icon: FileText,
    title: 'Get Diagnosis',
    description: 'Receive detailed disease identification with confidence scores.',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Treatment Plan',
    description: 'Get actionable treatment recommendations and prevention tips.',
  },
];

const stats = [
  { value: '17+', label: 'Diseases Detected' },
  { value: '4', label: 'Crop Types' },
  { value: '<3s', label: 'Analysis Time' },
  { value: '95%+', label: 'Accuracy Rate' },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container relative">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Smart Plant Disease Detection</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6"
            >
              Protect Your Crops with{' '}
              <span className="text-primary">AgroLeaf Guardian</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mb-10"
            >
              Upload a photo of your plant leaf and get instant diagnosis with treatment recommendations.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 justify-center mb-10"
            >
              {user ? (
                <Link to="/upload">
                  <Button size="lg" className="gap-2 px-8 h-14 text-base">
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=signup">
                    <Button size="lg" className="gap-2 px-8 h-14 text-base">
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button size="lg" variant="outline" className="px-8 h-14 text-base">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
            
            {/* Quick Stats Pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <LeafIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">4 Crop Types</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Accurate Detection</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Instant Results</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Powerful Features for <span className="text-primary">Crop Protection</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to keep your crops healthy and thriving with smart disease detection.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="h-full p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-all duration-300">
                  <div className="w-14 h-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-5">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              How It <span className="text-primary">Works</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Protect your crops in four simple steps. Our system delivers accurate diagnoses in seconds.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="h-full p-6 rounded-2xl bg-card border border-border">
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 right-6">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {step.number}
                    </div>
                  </div>
                  
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-5">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-12 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1),transparent)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Start Protecting Your Crops Today
              </h2>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                Join thousands of farmers using AI to detect plant diseases early
                and prevent crop losses.
              </p>
              {user ? (
                <Link to="/upload">
                  <Button size="lg" variant="secondary" className="gap-2 px-8 h-14 text-base">
                    Upload Your First Image
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth?mode=signup">
                  <Button size="lg" variant="secondary" className="gap-2 px-8 h-14 text-base">
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
