"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial match must be set synchronously to avoid hydration mismatch
    setMatches(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTouchDevice(): boolean {
  return useMediaQuery("(pointer: coarse)");
}

export function useIsFinePointer(): boolean {
  return useMediaQuery("(pointer: fine)");
}
