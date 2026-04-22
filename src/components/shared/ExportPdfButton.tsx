import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportElementToPdf } from "@/lib/pdf";

type Props = {
  targetRef: React.RefObject<HTMLElement | null>;
  filename: string;
  label?: string;
};

export function ExportPdfButton({ targetRef, filename, label = "PDF" }: Props) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        if (!targetRef.current) return;
        setLoading(true);
        try {
          await exportElementToPdf(targetRef.current, filename);
          toast.success("PDF gerado");
        } catch (e: any) {
          toast.error(e?.message ?? "Erro ao gerar PDF");
        } finally {
          setLoading(false);
        }
      }}
      className="uppercase tracking-wider"
    >
      <FileDown className="mr-2 h-3.5 w-3.5" />
      {loading ? "Gerando..." : label}
    </Button>
  );
}
