import { createFileRoute } from "@tanstack/react-router";
import { useStaff } from "@/hooks/useStaff";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Wrench,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { listAllUsers } from "@/server/staff.functions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/staff/users")({
  component: UsersListPage,
});

const PER_PAGE = 20;

function UsersListPage() {
  const { isOwner, hasStaffRole, loading } = useStaff();
  const allowed = isOwner || hasStaffRole("support");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["staff-all-users", page, search],
    queryFn: () =>
      listAllUsers({ data: { page, perPage: PER_PAGE, search } }),
    enabled: allowed,
    staleTime: 30_000,
  });

  if (loading) return null;
  if (!allowed) {
    return (
      <Card className="p-10 text-center border-destructive/40">
        <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-muted-foreground">
          Acesso restrito ao time de suporte.
        </p>
      </Card>
    );
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Suporte
        </div>
        <h1 className="font-display text-3xl tracking-wider">USUÁRIOS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lista completa de contas registradas no sistema.
        </p>
      </header>

      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              Limpar
            </Button>
          )}
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
          <span>
            {isLoading
              ? "Carregando..."
              : `${total} usuário${total === 1 ? "" : "s"}${search ? ` para "${search}"` : ""}`}
          </span>
          {isFetching && !isLoading && (
            <span className="text-[10px]">Atualizando...</span>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Carregando usuários...
          </div>
        ) : (data?.users.length ?? 0) === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-center">Equipes</TableHead>
                <TableHead className="text-center">Email</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Último login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.users.map((u) => {
                const isStaff = u.staff.some((s) => s.active);
                const isSuper = u.roles.includes("super_admin");
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(u.display_name ?? u.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {u.display_name || "—"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {isSuper && (
                          <Badge className="bg-gold/15 text-gold border-gold/40 text-[10px] uppercase tracking-wider gap-1">
                            <Crown className="h-3 w-3" /> Super
                          </Badge>
                        )}
                        {isStaff && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wider gap-1"
                          >
                            <Wrench className="h-3 w-3" />
                            {u.staff
                              .filter((s) => s.active)
                              .map((s) => s.role)
                              .join(", ")}
                          </Badge>
                        )}
                        {u.roles
                          .filter((r) => r !== "super_admin")
                          .map((r) => (
                            <Badge
                              key={r}
                              variant="secondary"
                              className="text-[10px] uppercase tracking-wider"
                            >
                              {r}
                            </Badge>
                          ))}
                        {!isStaff &&
                          !isSuper &&
                          u.roles.filter((r) => r !== "super_admin").length === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {u.team_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.email_confirmed_at ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.created_at
                        ? format(new Date(u.created_at), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.last_sign_in_at
                        ? format(new Date(u.last_sign_in_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })
                        : "Nunca"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
