"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import CowLoading from "./cow-loading";

function isInternalNavigationLink(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  const link = target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return false;
  if (link.target && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  if (link.origin !== window.location.origin) return false;
  return link.pathname !== window.location.pathname || link.search !== window.location.search;
}

export default function AppNavigationLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const show = () => setLoading(true);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (isInternalNavigationLink(event.target)) show();
    };

    window.addEventListener("click", onClick, true);
    window.addEventListener("farm:navigation-loading", show);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("farm:navigation-loading", show);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="cow-loading-screen" aria-label="Dang chuyen trang">
      <CowLoading label="Đang tải..." size="lg" tone="overlay" />
    </div>
  );
}
