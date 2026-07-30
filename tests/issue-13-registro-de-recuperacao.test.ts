import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  recuperacoesDaTurmaNoDia,
  recuperacoesDoAluno,
  RecuperacaoInvalida,
  registraRecuperacao,
} from '@/db/recuperacao'
import { garanteRegistroDiario } from '@/db/registro-diario'
import { alunos, dias, grupos, registrosDeRecuperacao, turmas, usuarios } from '@/db/schema'
import { AcessoNegado } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 13 em
// docs/BACKLOG.md. SSOT: `D5-RECUPERACAO` · Doc 5 §3.2 e §3.3.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 13 — registro de recuperação', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values([1, 2, 3].map((ordem) => ({ cursoId: curso.id, ordem })))
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 4001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    // Um grupo com dois e um grupo solo. O solo é caso válido (Doc 2 §2.4.1) e
    // é justamente quem não tem parceiro como fonte (Doc 5 §3.2).
    const [dupla] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()
    const [soloGrupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    async function matricula(nome: string, id: number, grupoId: string, posicao: number) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: id, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({ turmaId: turma!.id, usuarioId: usuario!.id, grupoId, posicaoNoGrupo: posicao })
        .returning()
      return { aluno: aluno!, usuario: usuario! }
    }

    return {
      curso,
      turma: turma!,
      dias: diasCriados,
      instrutora: instrutora!,
      ana: await matricula('Ana', 4100, dupla!.id, 1),
      bruno: await matricula('Bruno', 4101, dupla!.id, 2),
      solo: await matricula('Carla', 4102, soloGrupo!.id, 1),
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('registro_de_recuperacao_exige_todos_os_campos', async () => {
    const c = await cenario()
    const dia = c.dias[1]!

    // Aluno e dia vêm do registro diário; os outros três são deste registro. Os
    // cinco são obrigatórios (Doc 5 §3.3) — são 30 segundos de custo, e meio
    // registro não responde a quem está acompanhando.
    const incompletos = [
      { oQuePerdeu: '', oQueRepos: 'Li o commit do dia.', porQuem: { fonte: 'espelho' } },
      { oQuePerdeu: 'O bloco de estados.', oQueRepos: '  ', porQuem: { fonte: 'espelho' } },
      { oQuePerdeu: 'O bloco de estados.', oQueRepos: 'Li o commit.', porQuem: { fonte: '   ' } },
    ]
    for (const incompleto of incompletos) {
      await expect(
        registraRecuperacao(banco.db, c.ana.aluno.id, dia.id, incompleto, c.ana.usuario.id),
      ).rejects.toThrow(RecuperacaoInvalida)
    }
    expect(await recuperacoesDoAluno(banco.db, c.ana.aluno.id)).toHaveLength(0)

    // A obrigatoriedade é do BANCO, não só da aplicação.
    const registro = await garanteRegistroDiario(banco.db, c.ana.aluno.id, dia.id)
    await expect(
      banco.db.insert(registrosDeRecuperacao).values({
        registroDiarioId: registro.id,
        oQuePerdeu: '  ',
        oQueRepos: 'algo',
        fonteDeReposicao: 'espelho',
      }),
    ).rejects.toThrow()

    // "Por quem" tem UMA resposta: colega ou fonte, nunca as duas nem nenhuma.
    // Sem isso o instrutor leria "repôs" sem saber com o quê.
    await expect(
      banco.db.insert(registrosDeRecuperacao).values({
        registroDiarioId: registro.id,
        oQuePerdeu: 'a',
        oQueRepos: 'b',
      }),
    ).rejects.toThrow()
    await expect(
      banco.db.insert(registrosDeRecuperacao).values({
        registroDiarioId: registro.id,
        oQuePerdeu: 'a',
        oQueRepos: 'b',
        repostoPorAlunoId: c.bruno.aluno.id,
        fonteDeReposicao: 'espelho',
      }),
    ).rejects.toThrow()

    // Completo passa, nas duas formas de "por quem".
    await registraRecuperacao(
      banco.db,
      c.ana.aluno.id,
      dia.id,
      {
        oQuePerdeu: 'O bloco de estados do segundo dia.',
        oQueRepos: 'Li o commit do dia no repositório-espelho.',
        porQuem: { fonte: 'Repositório-espelho do instrutor' },
      },
      c.ana.usuario.id,
    )
    await registraRecuperacao(
      banco.db,
      c.ana.aluno.id,
      dia.id,
      {
        oQuePerdeu: 'A demonstração ao vivo.',
        oQueRepos: 'Bruno refez comigo na abertura.',
        porQuem: { colegaId: c.bruno.aluno.id },
      },
      c.ana.usuario.id,
    )

    // Duas linhas no mesmo dia, de propósito: quem perdeu duas coisas e repôs de
    // formas diferentes registra duas vezes.
    const registradas = await recuperacoesDoAluno(banco.db, c.ana.aluno.id)
    expect(registradas).toHaveLength(2)
    expect(registradas.map((r) => r.fonteDeReposicao !== null)).toEqual([true, false])
    expect(registradas[1]?.colega?.nome).toBe('Bruno')

    // Ninguém repõe para si mesmo: reposição por conta própria é o caso em que a
    // fonte é o material, e tem coluna própria.
    const proprio = await banco.db
      .insert(registrosDeRecuperacao)
      .values({
        registroDiarioId: registro.id,
        oQuePerdeu: 'a',
        oQueRepos: 'b',
        repostoPorAlunoId: c.ana.aluno.id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(proprio).toBeInstanceOf(Error)
    expect(causaDe(proprio)).toMatch(/nao repoe para si mesmo/)

    // E o registro é produção própria do aluno (Doc 7 §3).
    await expect(
      registraRecuperacao(
        banco.db,
        c.bruno.aluno.id,
        dia.id,
        { oQuePerdeu: 'a', oQueRepos: 'b', porQuem: { fonte: 'espelho' } },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(AcessoNegado)
  })

  it('instrutor_lista_recuperacoes_por_aluno', async () => {
    const c = await cenario()
    const [d1, d2, d3] = c.dias

    // Fora de ordem de propósito: a listagem ordena por dia, não por inserção.
    await registraRecuperacao(
      banco.db,
      c.ana.aluno.id,
      d3!.id,
      { oQuePerdeu: 'Terceiro dia.', oQueRepos: 'Material do dia.', porQuem: { fonte: 'plataforma' } },
      c.ana.usuario.id,
    )
    await registraRecuperacao(
      banco.db,
      c.ana.aluno.id,
      d1!.id,
      { oQuePerdeu: 'Primeiro dia.', oQueRepos: 'Espelho.', porQuem: { fonte: 'espelho' } },
      c.ana.usuario.id,
    )
    await registraRecuperacao(
      banco.db,
      c.bruno.aluno.id,
      d2!.id,
      { oQuePerdeu: 'Segundo dia.', oQueRepos: 'Ana refez comigo.', porQuem: { colegaId: c.ana.aluno.id } },
      c.bruno.usuario.id,
    )

    // Por aluno, em ordem de dia. E devolve o TEXTO, não uma contagem: o que o
    // instrutor lê antes da triagem é o que perdeu e como repôs, não quantas
    // vezes faltou (Doc 5 §3.3).
    const daAna = await recuperacoesDoAluno(banco.db, c.ana.aluno.id)
    expect(daAna.map((r) => r.ordemDoDia)).toEqual([1, 3])
    expect(daAna.map((r) => r.oQuePerdeu)).toEqual(['Primeiro dia.', 'Terceiro dia.'])

    // O registro de um aluno não aparece no do outro, mesmo dentro do grupo.
    const doBruno = await recuperacoesDoAluno(banco.db, c.bruno.aluno.id)
    expect(doBruno).toHaveLength(1)
    expect(doBruno[0]?.colega?.nome).toBe('Ana')

    // Nada aqui calcula limiar de conversão a copiloto: "não existe número de
    // faltas que o dispare" (Doc 5 §3.4), e um limiar transformaria exceção
    // humana em regra burocrática.
    expect(Object.keys(daAna[0] ?? {})).not.toContain('faltas')
    expect(daAna.every((r) => typeof r.oQueRepos === 'string')).toBe(true)

    // A leitura por turma e por dia é a da janela de abertura: o instrutor olha
    // a turma, não um aluno por vez.
    const noSegundo = await recuperacoesDaTurmaNoDia(banco.db, c.turma.id, d2!.id)
    expect(noSegundo).toHaveLength(1)
    expect(noSegundo[0]?.alunoId).toBe(c.bruno.aluno.id)
    expect(await recuperacoesDaTurmaNoDia(banco.db, c.turma.id, d1!.id)).toHaveLength(1)
  })

  it('aluno_solo_registra_reposicao_por_colega', async () => {
    const c = await cenario()
    const dia = c.dias[1]!

    // O aluno solo não tem parceiro de grupo — a fonte "parceiro de dupla" é
    // declaradamente indisponível para ele (Doc 5 §3.2). Mas "qualquer colega da
    // turma, sem designação prévia" continua valendo, e é isso que a plataforma
    // não pode restringir ao grupo.
    await registraRecuperacao(
      banco.db,
      c.solo.aluno.id,
      dia.id,
      {
        oQuePerdeu: 'A demonstração do segundo dia.',
        oQueRepos: 'Ana refez comigo na abertura.',
        porQuem: { colegaId: c.ana.aluno.id },
      },
      c.solo.usuario.id,
    )

    const registradas = await recuperacoesDoAluno(banco.db, c.solo.aluno.id)
    expect(registradas).toHaveLength(1)
    expect(registradas[0]?.colega?.nome).toBe('Ana')

    // Ana é de OUTRO grupo: é o ponto do critério. Se o modelo amarrasse o
    // colega ao grupo, o aluno solo ficaria sem fonte humana nenhuma.
    expect(c.solo.aluno.grupoId).not.toBe(c.ana.aluno.grupoId)

    // O limite é a turma, não o grupo. Colega de outra turma é recusado pelo
    // banco: o registro é a visibilidade do instrutor sobre quem ele conduz, e
    // apontaria para alguém fora do alcance dele.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra turma' })
      .returning()
    const [deFora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 4200, githubLogin: 'defora', nome: 'De Fora', papel: 'aluno' })
      .returning()
    const [alunoDeFora] = await banco.db
      .insert(alunos)
      .values({ turmaId: outraTurma!.id, usuarioId: deFora!.id })
      .returning()

    const registro = await garanteRegistroDiario(banco.db, c.solo.aluno.id, dia.id)
    const alheio = await banco.db
      .insert(registrosDeRecuperacao)
      .values({
        registroDiarioId: registro.id,
        oQuePerdeu: 'a',
        oQueRepos: 'b',
        repostoPorAlunoId: alunoDeFora!.id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(alheio).toBeInstanceOf(Error)
    expect(causaDe(alheio)).toMatch(/e da turma .* e o registro e da turma/)
  })
})
