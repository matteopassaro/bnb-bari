import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index.tsx";
import Booking from "./pages/Booking.tsx";
import Camere from "./pages/Camere.tsx";
import RoomDetail from "./pages/RoomDetail";
import NotFound from "./pages/NotFound.tsx";
import PrenotazioneConfermata from "./pages/PrenotazioneConfermata.tsx";
import Admin from "./pages/Admin.tsx";
import ScrollToTop from "./components/ScrollToTop";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "./components/PageTransition";
import FloatingContact from "./components/FloatingContact";

const queryClient = new QueryClient();

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <>
    <PageTransition />
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  </>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Index /></PageWrapper>} />
        <Route path="/camere" element={<PageWrapper><Camere /></PageWrapper>} />
        <Route path="/camera/:id" element={<PageWrapper><RoomDetail /></PageWrapper>} />
        <Route path="/prenota" element={<PageWrapper><Booking /></PageWrapper>} />
        <Route path="/prenotazione-confermata" element={<PageWrapper><PrenotazioneConfermata /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <FloatingContact />
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
