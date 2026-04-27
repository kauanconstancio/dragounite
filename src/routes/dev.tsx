import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStaff } from "@/hooks/useStaff";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/dev")({
  head: () => ({
    meta: [
      { title: "Staff Console — GymLy" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DevLayout,
});

function DevLayout() {
  const { isStaff, loading } = useStaff();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect bare /dev to the new /staff console (keep deep links like /dev/feedback working).
  useEffect(() => {
    if (!loading && isStaff && location.pathname === "/dev") {
      navigate({ to: "/staff", replace: true });
    }
  }, [loading, isStaff, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Verificando credenciais...
      </div>
    );
  }

  if (!isStaff) {
    return (
      <Card className="p-10 max-w-lg mx-auto text-center border-destructive/40">
        <ShieldAlert className="h-10 w-10 mx-auto text-destructive mb-3" />
        <h1 className="font-display text-2xl tracking-wider uppercase">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para funcionários da GymLy.{" "}
          <Link to="/staff" className="text-primary underline">Ir para Staff Console</Link>
        </p>
      </Card>
    );
  }

  return <Outlet />;
}
