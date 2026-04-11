import { useState } from "react";
import FadeIn from "./FadeIn";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const faqs = ["parking", "safety", "lateCheckin", "breakfast", "luggage"];

const FAQSection = () => {
  const { t } = useTranslation("home");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-28 bg-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <FadeIn direction="up">
              <p className="text-primary text-sm uppercase tracking-[0.2em] font-sans font-medium mb-3">
                {t("faq.eyebrow")}
              </p>
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
                {t("faq.title")}
              </h2>
            </FadeIn>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={i} direction="up" delay={0.1 * i}>
                <div className="border border-foreground/5 rounded-2xl bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-serif font-bold text-lg text-foreground">{t(`faq.items.${faq}.question`)}</span>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {openIndex === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                  </button>
                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    openIndex === i ? "max-h-96 pb-6 px-6" : "max-h-0"
                  )}>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(`faq.items.${faq}.answer`)}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
