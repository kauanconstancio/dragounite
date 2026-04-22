import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";

type Props = {
  active: boolean;
  onToggle: () => void;
};

export function PresentationToggle({ active, onToggle }: Props) {
  const prevBodyOverflow = useRef<string>("");
  useEffect(() => {
    if (active) {
      prevBodyOverflow.current = document.body.style.overflow;
      document.body.classList.add("presentation-mode");
    } else {
      document.body.classList.remove("presentation-mode");
      document.body.style.overflow = prevBodyOverflow.current;
    }
    return () => {
      document.body.classList.remove("presentation-mode");
    };
  }, [active]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && active) onToggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onToggle]);

  return (
    <Button variant="outline" size="sm" onClick={onToggle} className="uppercase tracking-wider">
      {active ? <Minimize2 className="mr-2 h-3.5 w-3.5" /> : <Maximize2 className="mr-2 h-3.5 w-3.5" />}
      {active ? "Sair" : "Apresentar"}
    </Button>
  );
}
