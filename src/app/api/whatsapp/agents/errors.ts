export function classifyAgentsRouteError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);

  if (/EVO_AUTH_EMAIL|EVO_AUTH_PASSWORD|Credenciais do Evo Auth Service ausentes/i.test(message)) {
    return {
      status: 503,
      code: "EVO_AUTH_MISSING",
      message:
        "Agentes IA dependem das credenciais do Evo Auth Service. Configure EVO_AUTH_EMAIL e EVO_AUTH_PASSWORD no ambiente.",
    };
  }

  return {
    status: 500,
    code: "AGENTS_ERROR",
    message: error instanceof Error ? error.message : "Erro ao listar agentes.",
  };
}
