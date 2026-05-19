interface LabelProps {
  children: React.ReactNode;
  tone?: "default" | "ad" | "direct" | "good" | "risk";
}

const tones = {
  default: "bg-black/8 text-black/65",
  ad: "bg-coral/12 text-coral",
  direct: "bg-moss/12 text-moss",
  good: "bg-sky/15 text-sky",
  risk: "bg-gold/18 text-[#8b620d]"
};

export function Label({ children, tone = "default" }: LabelProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-[11px] font-black ${tones[tone]}`}>
      {children}
    </span>
  );
}
