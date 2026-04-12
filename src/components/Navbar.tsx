import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const links = [
    { to: "/", label: t("links.home") },
    { to: "/camere", label: t("links.rooms") },
    { to: "/#posizione", label: t("links.location") },
    { to: "/#esplora", label: t("links.explore") },
    // { to: "/prenota", label: "Prenota" },
  ];

  const isTransparent = location.pathname === "/" && !scrolled;

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isTransparent ? "bg-transparent py-4" : "bg-background/90 backdrop-blur-md border-b py-2 shadow-sm"
    )}>
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <Link to="/" className={cn(
          "font-serif text-xl font-bold tracking-tight uppercase transition-colors",
          isTransparent ? "text-white drop-shadow-md" : "text-foreground"
        )}>
          {t("brand")}
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                isTransparent
                  ? "text-white/90 hover:text-white"
                  : (location.pathname === l.to ? "text-primary" : "text-muted-foreground")
              )}
            >
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher inverted={isTransparent} />
          <Button asChild size="sm" className={cn(isTransparent && "bg-white text-primary hover:bg-white/90")}>
            <Link to="/prenota">{t("cta.bookNow")}</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className={cn("md:hidden p-2 rounded-lg", isTransparent ? "text-white" : "text-foreground")}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block text-lg font-serif font-bold text-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <LanguageSwitcher onLanguageChange={() => setOpen(false)} />
              <Button asChild size="lg" className="w-full h-14 rounded-xl text-lg font-bold">
                <Link to="/prenota" onClick={() => setOpen(false)}>{t("cta.bookNow")}</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
