import { motion } from "framer-motion";
import { MockNode, nodeStatusColors } from "@/utils/mock-data";

export const NodeDot = ({
  node,
  onHover,
}: {
  node: MockNode;
  onHover: () => void;
}) => {
  const color = nodeStatusColors[node.status];
  const opacity = node.status === 'VOID' ? 0.1 : node.status === 'ACTIVE' ? 0.9 : 0.6;

  return (
    <motion.div
      className="w-2 h-2 rounded-full cursor-pointer transition-all duration-300"
      style={{ backgroundColor: color, opacity }}
      whileHover={{ scale: 1.5, opacity: 1 }}
      animate={
        node.status === 'ACTIVE'
          ? { scale: [1, 1.2, 1], opacity: [opacity, 1, opacity] }
          : {}
      }
      transition={
        node.status === 'ACTIVE'
          ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      onMouseEnter={onHover}
    />
  );
};
