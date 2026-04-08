import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-serif text-2xl font-bold mb-4">Casa del Sole</h3>
            <p className="text-background/70 text-sm leading-relaxed">
              B&B nel cuore della città vecchia di Bari. Ospitalità pugliese, camere con vista e colazione tradizionale ogni mattina.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg font-bold mb-4">Contatti</h4>
            <div className="space-y-3 text-sm text-background/70">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Via Venezia 12, 70122 Bari (BA)</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +39 080 123 4567</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> info@casadelsole.bari.it</p>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-lg font-bold mb-4">Link utili</h4>
            <div className="space-y-2 text-sm text-background/70">
              <Link to="/" className="block hover:text-background transition-colors">Home</Link>
              <Link to="/#camere" className="block hover:text-background transition-colors">Camere</Link>
              <Link to="/prenota" className="block hover:text-background transition-colors">Prenota</Link>
              <a href="https://www.viaggiareinpuglia.it" target="_blank" rel="noopener noreferrer" className="block hover:text-background transition-colors">Turismo Puglia</a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center text-xs text-background/50">
          © {new Date().getFullYear()} Casa del Sole B&B — Bari, Puglia. Tutti i diritti riservati.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
