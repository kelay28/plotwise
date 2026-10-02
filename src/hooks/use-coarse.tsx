import { useEffect, useState } from "react";

/** True on touch-first devices (phones/tablets). */
export function useCoarsePointer() {
  const [c, setC] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(pointer: coarse)");
    setC(m.matches);
    const on = () => setC(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return c;
}
