import { motion } from 'framer-motion';

interface LeafIconProps {
  className?: string;
  animate?: boolean;
}

export function LeafIcon({ className = "w-8 h-8", animate = false }: LeafIconProps) {
  const Icon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C12 22 12 17 12 12C12 7 17 2 22 2C22 2 17.5 2 12 2Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M12 2C17.5 2 22 6.5 22 12C22 17.5 17.5 22 12 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 22C12 17 7 12 2 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 22V12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 12C12 7 17 2 22 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  if (animate) {
    return (
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon />
      </motion.div>
    );
  }

  return <Icon />;
}
