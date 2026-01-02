import { motion } from "framer-motion";

export const QuoteBlock = ({ 
  content 
}: { 
  content: string 
}) => {
  return (
    <motion.blockquote
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className="my-16 pl-8 border-l-2 border-ethereal-ghost"
    >
      <p className="font-serif text-2xl md:text-3xl leading-relaxed text-ethereal whitespace-pre-line">
        {content}
      </p>
    </motion.blockquote>
  );
};
