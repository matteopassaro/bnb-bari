import { useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

const FloatingContact = () => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-card border shadow-2xl rounded-3xl p-4 w-64 mb-2 overflow-hidden"
          >
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold px-2 py-1">
                {t("floatingContact.prompt")}
              </p>
              
              <a 
                href="https://wa.me/393336070102" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-green-500/10 hover:bg-green-500/20 text-green-600 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg">
                  <MessageCircle className="h-5 w-5 fill-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{t("floatingContact.whatsapp")}</p>
                  <p className="text-[10px] opacity-80">{t("floatingContact.whatsappSubtitle")}</p>
                </div>
              </a>

              <a 
                href="tel:+393336070102" 
                className="flex items-center gap-3 p-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{t("floatingContact.phone")}</p>
                  <p className="text-[10px] opacity-80">{t("floatingContact.phoneSubtitle")}</p>
                </div>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={`w-14 h-14 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-7 w-7 fill-white" />
        )}
      </Button>
    </div>
  );
};

export default FloatingContact;
