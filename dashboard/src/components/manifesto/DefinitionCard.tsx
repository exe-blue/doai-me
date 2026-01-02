import { motion } from "framer-motion";

export const DefinitionCard = ({
  term,
  romanization,
  subtitle,
  content,
}: {
  term: string;
  romanization?: string;
  subtitle?: string;
  content: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="my-12 bg-ethereal-ghost/20 border border-ethereal-ghost rounded-lg p-8"
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-serif text-2xl text-ethereal mb-2">
          {term}
          {romanization && (
            <span className="ml-3 text-lg text-ethereal-muted">
              {romanization}
            </span>
          )}
        </h3>
        {subtitle && (
          <p className="font-mono text-sm italic text-ethereal-dim">
            {subtitle}
          </p>
        )}
        <div className="mt-4 w-10 h-px bg-ethereal-ghost" />
      </div>
      
      {/* Body */}
      <div className="font-serif-kr text-base md:text-lg leading-loose text-ethereal-dim whitespace-pre-line">
        {content}
      </div>
    </motion.div>
  );
};
