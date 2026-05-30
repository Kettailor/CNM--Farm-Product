type CowLoadingProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
  tone?: "inline" | "overlay";
};

export default function CowLoading({ label = "Đang tải...", size = "sm", tone = "inline" }: CowLoadingProps) {
  return (
    <span className={`cow-loading cow-loading-${size} cow-loading-${tone}`} role="status" aria-live="polite">
      <img src="/assets/img/con_bo.svg" alt="" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
