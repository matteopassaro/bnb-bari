import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation("common");

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-serif text-2xl font-bold mb-4">{t("site.footerBrand")}</h3>
            <p className="text-background/70 text-sm leading-relaxed">
              {t("site.description")}
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg font-bold mb-4">{t("footer.contacts")}</h4>
            <div className="space-y-3 text-sm text-background/70">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {t("site.addressLong")}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {t("site.phone")}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> {t("site.email")}</p>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-lg font-bold mb-4">{t("footer.usefulLinks")}</h4>
            <div className="space-y-2 text-sm text-background/70">
              <Link to="/" className="block hover:text-background transition-colors">{t("footer.home")}</Link>
              <Link to="/#camere" className="block hover:text-background transition-colors">{t("footer.rooms")}</Link>
              <Link to="/prenota" className="block hover:text-background transition-colors">{t("footer.book")}</Link>
              <a href="https://www.viaggiareinpuglia.it" target="_blank" rel="noopener noreferrer" className="block hover:text-background transition-colors">{t("site.tourismLink")}</a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 pt-8 text-center text-xs text-background/50">
          {t("site.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
