/**
 * ID da equipe inicial (DragoUnite Y) — fallback usado apenas quando a
 * equipe ativa do usuário ainda não foi resolvida (ex.: chamadas server-side
 * ou contextos fora do TeamProvider).
 *
 * Em código de cliente novo, prefira `useCurrentTeam().team.id`.
 */
export const DEFAULT_TEAM_ID = "8d394278-42da-42fa-8275-15d1d48cec11";
