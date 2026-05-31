"use client";

import { useEffect } from "react";

export default function PrintClient({ className }: { className?: string }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <button type="button" className={className} onClick={() => window.print()}>
      In / Lưu PDF
    </button>
  );
}
