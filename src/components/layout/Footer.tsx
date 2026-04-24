import { LeafIcon } from '@/components/ui/LeafIcon';
import { Github, Twitter, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <LeafIcon className="w-6 h-6" />
              </div>
              <span className="font-display font-bold">AgroLeaf Guardian</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered plant disease detection for sustainable agriculture.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Features</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Disease Detection</li>
              <li>Treatment Advisory</li>
              <li>Expert Review</li>
              <li>History Tracking</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Supported Crops</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Corn (Maize)</li>
              <li>Tomato</li>
              <li>Potato</li>
              <li>Wheat</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AgroLeaf Guardian. Built for sustainable farming.
        </div>
      </div>
    </footer>
  );
}
