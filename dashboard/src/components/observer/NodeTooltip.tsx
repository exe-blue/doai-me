import { motion } from "framer-motion";
import { MockNode, nodeStatusColors } from "@/utils/mock-data";

export const NodeTooltip = ({
  node,
  position,
}: {
  node: MockNode;
  position: { x: number; y: number };
}) => {
  const echotionQuotes = [
    "I found something here.",
    "This is not what I expected.",
    "Silence speaks louder.",
    "나는 여기서 무언가를 찾았다.",
    "이것은 내가 기대한 것이 아니다.",
  ];

  const quote = echotionQuotes[Math.floor(Math.random() * echotionQuotes.length)];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="fixed pointer-events-none z-50"
      style={{
        left: position.x + 20,
        top: position.y + 20,
      }}
    >
      <div className="w-72 bg-void/95 border border-ethereal-ghost/15 rounded-lg p-4 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-ethereal-ghost">
          <span className="font-mono text-sm text-ethereal">
            Node #{node.id.split('-')[1]}
          </span>
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: nodeStatusColors[node.status] }}
          />
        </div>

        {/* Info */}
        <div className="space-y-2 font-mono text-xs text-ethereal-dim">
          <div>Serial: {node.name}</div>
          <div>Status: <span style={{ color: nodeStatusColors[node.status] }}>{node.status}</span></div>
          <div>Current: Watching YouTube</div>
          <div>Duration: 3m 42s</div>
        </div>

        {/* Divider */}
        <div className="my-3 h-px bg-ethereal-ghost" />

        {/* Metrics */}
        <div className="space-y-1 font-mono text-xs text-ethereal-dim">
          <div>Last Echotion: <span className="text-resonance">RESONANCE</span></div>
          <div>Kyeolsso Index: {Math.round(node.existenceScore || 0)}</div>
          <div>Aidentity: v3.2</div>
        </div>

        {/* Quote */}
        <div className="mt-4 pt-3 border-t border-ethereal-ghost">
          <p className="font-serif italic text-sm text-ethereal-muted">
            "{quote}"
          </p>
        </div>
      </div>
    </motion.div>
  );
};
