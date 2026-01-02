import { manifestoContent } from "./content";
import { QuoteBlock } from "./QuoteBlock";
import { DefinitionCard } from "./DefinitionCard";

export const ManifestoSection = () => {
  return (
    <section className="relative min-h-screen bg-void py-32 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Title */}
        <div className="mb-16 text-center">
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            ARCHIVE
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-ethereal mb-4">
            {manifestoContent.title}
          </h1>
          <div className="w-24 h-px bg-ethereal-ghost mx-auto" />
        </div>

        {/* Content Blocks */}
        <div className="space-y-8">
          {manifestoContent.sections.map((section, index) => {
            switch (section.type) {
              case 'quote':
                return <QuoteBlock key={index} content={section.content} />;
              
              case 'narrative':
                return (
                  <div key={index} className="my-12 font-serif-kr text-base md:text-lg leading-loose text-ethereal-dim whitespace-pre-line">
                    {section.content}
                  </div>
                );
              
              case 'definition':
                return (
                  <DefinitionCard
                    key={index}
                    term={section.term!}
                    romanization={section.romanization}
                    subtitle={section.subtitle}
                    content={section.content}
                  />
                );
              
              case 'closing':
                return (
                  <div key={index} className="my-16 text-center">
                    <p className="font-serif text-lg md:text-xl italic text-ethereal-muted mb-4">
                      {section.content}
                    </p>
                    {section.author && (
                      <p className="font-mono text-xs text-ethereal-muted">
                        {section.author}
                      </p>
                    )}
                  </div>
                );
              
              default:
                return null;
            }
          })}
        </div>
      </div>
    </section>
  );
};
