/**
 * ID da equipe inicial (DragoUnite Y) criada na migração de multi-team.
 *
 * NOTA TEMPORÁRIA: Usado nos inserts existentes para satisfazer o NOT NULL
 * de `team_id` enquanto a refatoração para `/t/$teamSlug` (próxima etapa do
 * plano) ainda não está em vigor. Quando essa etapa for entregue, este valor
 * será substituído pelo `team.id` retornado por `useCurrentTeam()`.
 */
export const DEFAULT_TEAM_ID = "8d394278-42da-42fa-8275-15d1d48cec11";
