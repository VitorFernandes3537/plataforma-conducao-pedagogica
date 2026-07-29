// Barrel do schema. O drizzle-kit lê exclusivamente deste arquivo.
//
// Vazio por decisão de escopo: a INFRA-1 entrega o toolchain de migration,
// e nenhuma entidade de domínio (Doc 7 §2.1). As entidades entram nas
// issues 1 e 2 — e a partir daí toda migration é ADITIVA, porque o banco
// carrega avaliação real de aluno desde o D1 (ADR 0001, Consequências).

export {}
