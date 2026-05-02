export default function SectionDivider() {
  return (
    <div className="flex items-center gap-5 max-w-[1100px] mx-auto px-10 py-2">
      <div className="flex-1 h-px bg-borderDark" />
      <span className="text-textMuted/30 text-xs">✦</span>
      <div className="flex-1 h-px bg-borderDark" />
    </div>
  );
}
