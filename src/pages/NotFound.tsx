import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import FadeIn from "@/components/FadeIn";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation("common");
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-lg">
        <FadeIn direction="up">
          <span className="text-primary font-serif font-bold text-9xl block mb-6 opacity-20">404</span>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t("notFound.title")}</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed font-light">
            {t("notFound.description")}
          </p>
          <Button asChild size="lg" className="rounded-full px-10 h-14 font-semibold text-lg">
            <Link to="/">{t("notFound.cta")}</Link>
          </Button>
        </FadeIn>
      </div>
    </div>
  );
};

export default NotFound;
