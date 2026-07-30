import { readFileSync } from 'node:fs'

import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import {
  escalaDoCurso,
  garanteRegistroDiario,
  lancaAvaliacaoDoAluno,
  lancaAvaliacaoDoGrupo,
  lancamentoDoDia,
  registroDoDia,
  RegistroInvalido,
  removeAvaliacao,
} from '@/db/registro-diario'
import {
  alunos,
  avaliacoesDeObstaculo,
  dias,
  grupos,
  niveisDeAvaliacao,
  obstaculos,
  registrosDiarios,
  turmas,
  usuarios,
} from '@/db/schema'
import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 11 em
// docs/BACKLOG.md. SSOT: `D6-CAPTURA` · `D6-ESCALA` · Doc 6 §1.1 · Doc 5 §6.

/**
 * A escala deste curso de teste, com os descritores do Doc 6 §2 traduzidos para
 * vocabulário genérico.
 *
 * São DADO, não regra: um curso com outra escala cadastra outras linhas, e é
 * exatamente isso que o último teste deste arquivo verifica.
 */
const ESCALA = [
  { valor: 0, descritor: 'Não superou o critério do obstáculo', contaComoSuperacao: false },
  { valor: 1, descritor: 'Superou com apoio direto do instrutor', contaComoSuperacao: true },
  { valor: 2, descritor: 'Superou de forma autônoma', contaComoSuperacao: true },
  { valor: 3, descritor: 'Superou e generalizou', contaComoSuperacao: true },
]

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 11 — RegistroDiario: avaliação, log e push', () => {
  let banco: BancoEfemero

  /** Nada aqui é regra: é a configuração de um curso fictício. */
  const TAMANHO_DE_GRUPO = 3

  async function cenario() {
    const curso = await criaCurso(banco, { tamanhoMaximoDeGrupo: TAMANHO_DE_GRUPO })
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [dia] = await banco.db
      .insert(dias)
      .values({ cursoId: curso.id, ordem: 4 })
      .returning()

    await banco.db.insert(niveisDeAvaliacao).values(ESCALA.map((n) => ({ cursoId: curso.id, ...n })))

    const obstaculosCriados = await banco.db
      .insert(obstaculos)
      .values([
        {
          cursoId: curso.id,
          ordem: 1,
          pergunta: 'Por que meu programa aceita um estado que não existe?',
          peso: 1,
        },
        {
          cursoId: curso.id,
          ordem: 2,
          pergunta: 'Por que minha condicional não para de crescer?',
          peso: 2,
        },
      ])
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 6001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    // Três integrantes de propósito: o teto é configuração, e um teste que
    // criasse dois deixaria passar um `[0]` e `[1]` embutidos no lançamento.
    const integrantes = []
    for (let i = 0; i < TAMANHO_DE_GRUPO; i += 1) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({
          githubUserId: 6100 + i,
          githubLogin: `aluno${i}`,
          nome: `Aluno ${i}`,
          papel: 'aluno',
        })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({
          turmaId: turma!.id,
          usuarioId: usuario!.id,
          grupoId: grupo!.id,
          posicaoNoGrupo: i + 1,
        })
        .returning()
      integrantes.push({ aluno: aluno!, usuario: usuario! })
    }

    return {
      curso,
      turma: turma!,
      dia: dia!,
      primeiro: obstaculosCriados[0]!,
      segundo: obstaculosCriados[1]!,
      instrutora: instrutora!,
      grupo: grupo!,
      integrantes,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('avaliacao_aceita_apenas_zero_a_tres', async () => {
    const c = await cenario()
    const alvo = c.integrantes[0]!.aluno

    // A escala deste curso é 0, 1, 2 e 3 — e o descritor vem com ela, porque é
    // a frase que faz o instrutor lançar amanhã a mesma nota que lançou hoje.
    const escala = await escalaDoCurso(banco.db, c.curso.id)
    expect(escala.map((n) => n.valor)).toEqual([0, 1, 2, 3])
    expect(escala.map((n) => n.contaComoSuperacao)).toEqual([false, true, true, true])

    for (const nivel of escala) {
      const { nivel: gravado } = await lancaAvaliacaoDoAluno(banco.db, alvo.id, {
        diaId: c.dia.id,
        obstaculoId: c.primeiro.id,
        valor: nivel.valor,
        instrutorId: c.instrutora.id,
      })
      expect(gravado.valor).toBe(nivel.valor)
    }

    // Fora da escala não entra, e o instrutor recebe frase em vez de violação
    // de constraint.
    for (const foraDaEscala of [-1, 4, 10]) {
      const erro = await lancaAvaliacaoDoAluno(banco.db, alvo.id, {
        diaId: c.dia.id,
        obstaculoId: c.primeiro.id,
        valor: foraDaEscala,
        instrutorId: c.instrutora.id,
      }).then(
        () => null,
        (e: unknown) => e as Error,
      )
      expect(erro).toBeInstanceOf(RegistroInvalido)
      expect(erro?.message).toContain('0, 1, 2, 3')
    }

    // A faixa é DADO. Outro curso configura outra escala, sem tocar em código —
    // e é isso que impede o 0–3 de virar literal em `src/`.
    const outroCurso = await criaCurso(banco, { nome: 'Curso com escala de cinco' })
    await banco.db.insert(niveisDeAvaliacao).values(
      [0, 1, 2, 3, 4].map((valor) => ({
        cursoId: outroCurso.id,
        valor,
        descritor: `Nível ${valor}`,
        contaComoSuperacao: valor >= 2,
      })),
    )
    const outraEscala = await escalaDoCurso(banco.db, outroCurso.id)
    expect(outraEscala.map((n) => n.valor)).toEqual([0, 1, 2, 3, 4])
    expect(outraEscala.filter((n) => n.contaComoSuperacao).map((n) => n.valor)).toEqual([2, 3, 4])

    // E o nível de um curso não serve para o outro: a chave estrangeira garante
    // que o nível EXISTE, e o gatilho garante que é o nível certo.
    //
    // O obstáculo é o SEGUNDO de propósito. Usar o primeiro faria a unicidade
    // por (registro, obstáculo) recusar o insert sozinha, e o teste passaria sem
    // provar nada sobre o gatilho.
    const registro = await garanteRegistroDiario(banco.db, alvo.id, c.dia.id)
    const cruzado = await banco.db
      .insert(avaliacoesDeObstaculo)
      .values({
        registroDiarioId: registro.id,
        obstaculoId: c.segundo.id,
        nivelId: outraEscala[0]!.id,
        lancadoPorId: c.instrutora.id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(cruzado).toBeInstanceOf(Error)
    expect(causaDe(cruzado)).toMatch(/nivel .* e da escala do curso/)

    // Mesma prova para o obstáculo: nível certo, obstáculo de outro curso.
    const [obstaculoAlheio] = await banco.db
      .insert(obstaculos)
      .values({ cursoId: outroCurso.id, ordem: 1, pergunta: 'Pergunta de outro curso?', peso: 1 })
      .returning()
    const obstaculoCruzado = await banco.db
      .insert(avaliacoesDeObstaculo)
      .values({
        registroDiarioId: registro.id,
        obstaculoId: obstaculoAlheio!.id,
        nivelId: escala[0]!.id,
        lancadoPorId: c.instrutora.id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(obstaculoCruzado).toBeInstanceOf(Error)
    expect(causaDe(obstaculoCruzado)).toMatch(/obstaculo .* e do curso/)
  })

  it('registro_diario_pertence_a_aluno_e_dia', async () => {
    const c = await cenario()
    const [um, outro] = [c.integrantes[0]!.aluno, c.integrantes[1]!.aluno]

    const primeiro = await garanteRegistroDiario(banco.db, um.id, c.dia.id)

    // Idempotente: o aluno confirmando push e o instrutor lançando nota
    // acontecem no mesmo minuto, e os dois precisam do registro.
    const denovo = await garanteRegistroDiario(banco.db, um.id, c.dia.id)
    expect(denovo.id).toBe(primeiro.id)

    // Um por aluno por dia — dois deixariam duas notas do mesmo obstáculo no
    // mesmo dia, e nenhuma tela saberia qual mostrar.
    await expect(
      banco.db.insert(registrosDiarios).values({ alunoId: um.id, diaId: c.dia.id }),
    ).rejects.toThrow()

    // Outro aluno, mesmo dia: registro próprio. É o que impede o ausente de
    // herdar a nota do parceiro (Doc 7 §2.2).
    const doOutro = await garanteRegistroDiario(banco.db, outro.id, c.dia.id)
    expect(doOutro.id).not.toBe(primeiro.id)

    // Mesmo aluno, outro dia: registro próprio.
    const [outroDia] = await banco.db
      .insert(dias)
      .values({ cursoId: c.curso.id, ordem: 5 })
      .returning()
    const noOutroDia = await garanteRegistroDiario(banco.db, um.id, outroDia!.id)
    expect(noOutroDia.id).not.toBe(primeiro.id)

    // E o dia tem de ser do curso do aluno. Nada em DDL impede o cruzamento; o
    // gatilho impede — sem ele a nota apareceria num calendário onde ninguém a
    // procura.
    const outroCurso = await criaCurso(banco, { nome: 'Outro curso' })
    const [diaAlheio] = await banco.db
      .insert(dias)
      .values({ cursoId: outroCurso.id, ordem: 1 })
      .returning()

    const cruzado = await garanteRegistroDiario(banco.db, um.id, diaAlheio!.id).then(
      () => null,
      (e: unknown) => e,
    )
    expect(cruzado).toBeInstanceOf(Error)
    expect(causaDe(cruzado)).toMatch(/dia .* e do curso .* e o aluno .* e do curso/)
  })

  it('lancamento_por_grupo_preenche_ambos', async () => {
    const c = await cenario()

    const { alunosAtingidos } = await lancaAvaliacaoDoGrupo(banco.db, c.grupo.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 2,
      instrutorId: c.instrutora.id,
    })

    // Todos os integrantes, quantos forem. Três aqui porque o teto é
    // configuração (Doc 2 §2.4.1) — um teste com dois deixaria passar um
    // lançamento embutido em `[0]` e `[1]`.
    expect(alunosAtingidos).toHaveLength(TAMANHO_DE_GRUPO)
    expect(new Set(alunosAtingidos).size).toBe(TAMANHO_DE_GRUPO)

    for (const { aluno } of c.integrantes) {
      const registro = await registroDoDia(banco.db, aluno.id, c.dia.id)
      expect(registro?.avaliacoes).toHaveLength(1)
      expect(registro?.avaliacoes[0]?.valor).toBe(2)
      expect(registro?.avaliacoes[0]?.superado).toBe(true)
      expect(registro?.avaliacoes[0]?.lancadoPorId).toBe(c.instrutora.id)
    }

    // Cada aluno tem a PRÓPRIA linha. É o que permite divergir um sem mexer no
    // outro — o valor igual é padrão, não vínculo.
    const linhas = await banco.db.select().from(avaliacoesDeObstaculo)
    expect(linhas).toHaveLength(TAMANHO_DE_GRUPO)

    // Relançar para o grupo corrige o valor de todos.
    await lancaAvaliacaoDoGrupo(banco.db, c.grupo.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 3,
      instrutorId: c.instrutora.id,
    })
    for (const { aluno } of c.integrantes) {
      const registro = await registroDoDia(banco.db, aluno.id, c.dia.id)
      expect(registro?.avaliacoes[0]?.valor).toBe(3)
    }
    expect(await banco.db.select().from(avaliacoesDeObstaculo)).toHaveLength(TAMANHO_DE_GRUPO)

    // Grupo de um aluno escreve uma linha. O método aceita grupo solo
    // (Doc 2 §2.4.1), e o lançamento não pode presumir companhia.
    const [grupoSolo] = await banco.db.insert(grupos).values({ turmaId: c.turma.id }).returning()
    const [usuarioSolo] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 6900, githubLogin: 'solo', nome: 'Solo', papel: 'aluno' })
      .returning()
    await banco.db.insert(alunos).values({
      turmaId: c.turma.id,
      usuarioId: usuarioSolo!.id,
      grupoId: grupoSolo!.id,
      posicaoNoGrupo: 1,
    })

    const solo = await lancaAvaliacaoDoGrupo(banco.db, grupoSolo!.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 1,
      instrutorId: c.instrutora.id,
    })
    expect(solo.alunosAtingidos).toHaveLength(1)

    // Só o instrutor lança. A matriz já barra a rota; esta é a segunda tranca.
    await expect(
      lancaAvaliacaoDoGrupo(banco.db, c.grupo.id, {
        diaId: c.dia.id,
        obstaculoId: c.primeiro.id,
        valor: 0,
        instrutorId: c.integrantes[0]!.usuario.id,
      }),
    ).rejects.toThrow(NaoAutorizado)
  })

  it('instrutor_diverge_nota_individual', async () => {
    const c = await cenario()
    const [um, dois, tres] = c.integrantes.map((i) => i.aluno)

    await lancaAvaliacaoDoGrupo(banco.db, c.grupo.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 2,
      instrutorId: c.instrutora.id,
    })

    // "O instrutor diverge apenas quando observa diferença real entre os
    // repositórios" (Doc 6 §1.1). Divergir é reescrever o valor de um só.
    await lancaAvaliacaoDoAluno(banco.db, dois!.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 0,
      instrutorId: c.instrutora.id,
    })

    const valores = await Promise.all(
      [um!, dois!, tres!].map(async (a) => {
        const r = await registroDoDia(banco.db, a.id, c.dia.id)
        return r?.avaliacoes[0]?.valor
      }),
    )
    expect(valores).toEqual([2, 0, 2])

    // Divergir para baixo tira a superação de um sem tirar dos outros: o
    // predicado vem de `contaComoSuperacao`, não de comparação com número.
    const doDivergido = await registroDoDia(banco.db, dois!.id, c.dia.id)
    expect(doDivergido?.avaliacoes[0]?.superado).toBe(false)
    expect(doDivergido?.avaliacoes[0]?.descritor).toBe(ESCALA[0]!.descritor)

    // "Sem avaliação" não é a mesma coisa que nível 0 — o Doc 6 §3.2 grava zero
    // explícito, e zero é afirmação sobre o aluno. Corrigir um lançamento
    // errado não pode obrigar o instrutor a afirmar isso.
    const { removidas } = await removeAvaliacao(
      banco.db,
      tres!.id,
      c.dia.id,
      c.primeiro.id,
      c.instrutora.id,
    )
    expect(removidas).toBe(1)
    const semNota = await registroDoDia(banco.db, tres!.id, c.dia.id)
    expect(semNota?.avaliacoes).toHaveLength(0)

    // A tela do fechamento distingue os três estados. Sem isso, o aluno
    // esquecido seria indistinguível do aluno que tirou zero.
    const fila = await lancamentoDoDia(banco.db, c.turma.id, c.dia.id, c.primeiro.id)
    expect(fila).toHaveLength(TAMANHO_DE_GRUPO)
    expect(fila.find((l) => l.alunoId === um!.id)?.valor).toBe(2)
    expect(fila.find((l) => l.alunoId === dois!.id)?.valor).toBe(0)
    expect(fila.find((l) => l.alunoId === tres!.id)?.valor).toBeNull()
  })

  it('nenhum_numero_da_escala_mora_no_codigo', async () => {
    // O guarda que sustenta a decisão do commit de schema. A escala e o limiar
    // de superação são dado; se voltarem para o código, este teste avisa.
    //
    // Procura o padrão específico — comparação de nível com literal e faixa
    // embutida —, não qualquer número: `posicaoNoGrupo: i + 1` é aritmética de
    // índice, e reprovar isso seria proibir programação em nome de uma regra
    // sobre pedagogia.
    const fontes = ['src/db/registro-diario.ts', 'src/db/schema/index.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')

    expect(fontes).not.toMatch(/nivel\s*[<>]=?\s*\d/i)
    expect(fontes).not.toMatch(/valor\s*[<>]=?\s*\d/i)
    expect(fontes).not.toMatch(/between\s+0\s+and\s+3/i)
    expect(fontes).not.toMatch(/contaComoSuperacao\s*[:=]\s*(true|false)/)

    // E o mesmo vale para as migrations: um CHECK com a faixa cumpriria a linha
    // do Doc 7 §2.4 e violaria a do §1, na mesma tabela.
    const migration = readFileSync('drizzle/0011_registro_diario.sql', 'utf8')
    expect(migration).not.toMatch(/valor.*between/i)
    expect(migration).not.toMatch(/valor.*>=\s*0/i)

    // O predicado de superação é lido do banco, e é o mesmo para todos os
    // consumidores. Prova por comportamento: mudar o dado muda a resposta.
    const c = await cenario()
    await banco.db
      .update(niveisDeAvaliacao)
      .set({ contaComoSuperacao: false })
      .where(and(eq(niveisDeAvaliacao.cursoId, c.curso.id), eq(niveisDeAvaliacao.valor, 1)))

    await lancaAvaliacaoDoAluno(banco.db, c.integrantes[0]!.aluno.id, {
      diaId: c.dia.id,
      obstaculoId: c.primeiro.id,
      valor: 1,
      instrutorId: c.instrutora.id,
    })

    const registro = await registroDoDia(banco.db, c.integrantes[0]!.aluno.id, c.dia.id)
    expect(registro?.avaliacoes[0]?.valor).toBe(1)
    expect(registro?.avaliacoes[0]?.superado).toBe(false)
  })
})
