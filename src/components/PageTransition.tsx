import { motion } from "framer-motion";

const PageTransition = () => {
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-primary z-[9999] origin-left"
      initial={{ scaleX: 0, opacity: 1 }}
      animate={{ 
        scaleX: [0, 0.3, 0.7, 1],
        opacity: [1, 1, 1, 0]
      }}
      exit={{ scaleX: 0, opacity: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: "easeInOut",
        times: [0, 0.2, 0.8, 1]
      }}
    />
  );
};

export default PageTransition;
