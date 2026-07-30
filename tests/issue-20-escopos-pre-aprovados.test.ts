import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  AtribuicaoInvalida,
  atribuiEscopo,
  escoposDeReserva,
  escoposVisiveis,
} from '@/db/escopo-pre-aprovado'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import { EscopoInvalido, gravaResposta } from '@/db/resposta-de-escopo'
import {
  bancosDeTemas,
  escoposPreAprovados,
  formularios,
  grupos,
  perguntasDoFormulario,
  respostasDeEscopo,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'
import type { Ator } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 20 em
// docs/BACKLOG.md. SSOT: Doc 5 §5.1 (`D5-NAOAPROVACAO`) · Doc 7 §2.3 e §2.4.

const INSTRUTOR: Ator = { papel: 'instrutor', usuarioId: 'u-instrutor' }

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 20 — escopos pré-aprovados', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [bancoDeTemas] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()

    const temasCriados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Reserva um', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Reserva dois', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Tema comum', dificuldade: 'Médio', trilha: 'padrao' },
      ])
      .returning()

    const escopos = await banco.db
      .insert(escoposPreAprovados)
      .values([
        {
          temaId: temasCriados[0]!.id,
          titulo: 'Escopo de emergência um',
          conteudo: 'Formulário já respondido, pronto para entregar.',
        },
        {
          temaId: temasCriados[1]!.id,
          titulo: 'Escopo de emergência dois',
          conteudo: 'Formulário já respondido, pronto para entregar.',
        },
      ])
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    return {
      curso,
      turma: turma!,
      temas: temasCriados,
      escopos,
      grupoA: gruposCriados[0]!,
      grupoB: gruposCriados[1]!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('instrutor_cadastra_escopo_pre_aprovado', async () => {
    const { curso, escopos } = await cenario()

    // Cadastrados antes do primeiro dia, e de reserva enquanto ninguém precisa.
    expect(escopos).toHaveLength(2)
    expect(escopos.every((e) => e.grupoId === null)).toBe(true)
    expect(escopos.every((e) => e.atribuidoEm === null)).toBe(true)

    // Ordenado por nome do tema, não por inserção: a lista precisa ser estável
    // entre sessões para o instrutor achar o mesmo escopo no mesmo lugar.
    const dereserva = await escoposDeReserva(banco.db, curso.id)
    expect(dereserva.map((e) => e.temaNome)).toEqual(['Reserva dois', 'Reserva um'])
    expect(dereserva.map((e) => e.titulo).sort()).toEqual([
      'Escopo de emergência dois',
      'Escopo de emergência um',
    ])

    // A quantidade NÃO é constante: o Doc 5 fala de dois neste curso, e nada no
    // código conta escopos. Um terceiro entra sem tocar em nada.
    const fontes = ['src/db/escopo-pre-aprovado.ts', 'src/db/schema/index.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/\bMAX_ESCOPOS|LIMITE_DE_ESCOPOS\b/)
  })

  it('escopo_pre_aprovado_respeita_unicidade', async () => {
    const { turma, temas: temasCriados, escopos, grupoA, grupoB } = await cenario()

    await atribuiEscopo(banco.db, escopos[0]!.id, grupoA.id)

    // "Um Tema pertence a no máximo um Grupo por Turma" — Doc 7 §2.4. O índice
    // único parcial é quem garante, então nem uma escrita direta passa.
    const erro = await banco.db
      .update(grupos)
      .set({ temaId: temasCriados[0]!.id })
      .where(eq(grupos.id, grupoB.id))
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(erro).toBeInstanceOf(Error)

    // Mas vários grupos SEM tema convivem: o índice é parcial, e NULL não
    // colide com NULL.
    const [terceiro] = await banco.db.insert(grupos).values({ turmaId: turma.id }).returning()
    expect(terceiro?.temaId).toBeNull()

    // E o mesmo tema pode ser usado em OUTRA turma do mesmo curso.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: turma.cursoId, nome: 'Outra turma' })
      .returning()
    const [grupoDaOutra] = await banco.db
      .insert(grupos)
      .values({ turmaId: outraTurma!.id, temaId: temasCriados[0]!.id })
      .returning()
    expect(grupoDaOutra?.temaId).toBe(temasCriados[0]!.id)
  })

  it('escopo_pre_aprovado_nao_usado_e_invisivel', async () => {
    const { curso, escopos, grupoA, grupoB } = await cenario()

    const alunoDoA: Ator = { papel: 'aluno', usuarioId: 'u-a', grupoId: grupoA.id }
    const alunoDoB: Ator = { papel: 'aluno', usuarioId: 'u-b', grupoId: grupoB.id }
    const alunoSemGrupo: Ator = { papel: 'aluno', usuarioId: 'u-s', grupoId: null }

    // Nada atribuído: nenhum aluno vê nada. Se a turma descobre que existe
    // saída fácil, o marco deixa de ser duro (Doc 5 §5.1).
    expect(await escoposVisiveis(banco.db, curso.id, alunoDoA)).toHaveLength(0)
    expect(await escoposVisiveis(banco.db, curso.id, alunoSemGrupo)).toHaveLength(0)

    // Atribuído ao grupo A: só o A vê, e o B continua sem ver.
    await atribuiEscopo(banco.db, escopos[0]!.id, grupoA.id)

    const vistoPeloA = await escoposVisiveis(banco.db, curso.id, alunoDoA)
    expect(vistoPeloA).toHaveLength(1)
    expect(vistoPeloA[0]?.titulo).toBe('Escopo de emergência um')

    expect(await escoposVisiveis(banco.db, curso.id, alunoDoB)).toHaveLength(0)
    expect(await escoposVisiveis(banco.db, curso.id, alunoSemGrupo)).toHaveLength(0)

    // Doc 7 §3: "Instrutor — Tudo." Inclusive o que está de reserva.
    expect(await escoposVisiveis(banco.db, curso.id, INSTRUTOR)).toHaveLength(2)
    expect(await escoposDeReserva(banco.db, curso.id)).toHaveLength(1)
  })

  it('atribuicao_e_transacional_e_recusa_estado_invalido', async () => {
    const { curso, escopos, grupoA, grupoB } = await cenario()

    await atribuiEscopo(banco.db, escopos[0]!.id, grupoA.id)

    // O mesmo escopo não vai para dois grupos: a rede do instrutor mentiria
    // sobre quantas reservas restam.
    await expect(atribuiEscopo(banco.db, escopos[0]!.id, grupoB.id)).rejects.toThrow(
      AtribuicaoInvalida,
    )

    // Grupo que já tem tema não recebe escopo de emergência.
    await expect(atribuiEscopo(banco.db, escopos[1]!.id, grupoA.id)).rejects.toThrow(
      AtribuicaoInvalida,
    )

    // Nada foi consumido pela tentativa que falhou.
    expect(await escoposDeReserva(banco.db, curso.id)).toHaveLength(1)

    // Escopo inexistente falha como regra, não como erro de banco.
    await expect(
      atribuiEscopo(banco.db, escopos[0]!.id.replace(/.$/, '0'), grupoB.id),
    ).rejects.toThrow(AtribuicaoInvalida)
  })

  it('escopo_pre_aprovado_entra_como_aprovado', async () => {
    const { curso, escopos, temas: temasDoCenario, grupoA, grupoB } = await cenario()

    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário' })
      .returning()
    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({
        githubUserId: 7001,
        githubLogin: 'instrutora',
        nome: 'Instrutora',
        papel: 'instrutor',
      })
      .returning()
    const entrega = { instrutorId: instrutora!.id, formularioId: formulario!.id }

    await atribuiEscopo(banco.db, escopos[0]!.id, grupoA.id, entrega)

    // O grupo entra APROVADO, sem passar pela fila: o pré-aprovado é a rede do
    // instrutor num marco em que o grupo não passou (Doc 5 §5.1), e pedir
    // aprovação do que já vem aprovado seria gastar de novo o tempo que a rede
    // existe para salvar.
    const [doGrupoA] = await banco.db
      .select()
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.grupoId, grupoA.id))
    expect(doGrupoA?.estado).toBe('aprovado')
    expect(doGrupoA?.decididoPorId).toBe(instrutora!.id)
    expect(doGrupoA?.submetidoEm).not.toBeNull()

    // E já nasce fechado para o grupo, pelo gatilho da issue 9.
    const [pergunta] = await banco.db
      .insert(perguntasDoFormulario)
      .values({
        formularioId: formulario!.id,
        ordem: 1,
        enunciado: 'Escopo?',
        criterioDeAceite: 'Verificável.',
      })
      .returning()
    await expect(
      gravaResposta(banco.db, doGrupoA!.id, pergunta!.id, 'ampliando'),
    ).rejects.toThrow(EscopoInvalido)

    // Sem `entrega`, só o tema é alocado: é o caminho de quem está reservando
    // antes do marco, e não há decisão a registrar ainda.
    await atribuiEscopo(banco.db, escopos[1]!.id, grupoB.id)
    expect(
      await banco.db
        .select()
        .from(respostasDeEscopo)
        .where(eq(respostasDeEscopo.grupoId, grupoB.id)),
    ).toHaveLength(0)

    // Aluno não consegue se dar a própria rede.
    const [aluno] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 7002, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' })
      .returning()
    const [terceiroTema] = await banco.db
      .insert(temas)
      .values({
        bancoDeTemasId: temasDoCenario[0]!.bancoDeTemasId,
        nome: 'Tema C',
        dificuldade: 'Fácil',
        trilha: 'padrao',
      })
      .returning()
    const [terceiroEscopo] = await banco.db
      .insert(escoposPreAprovados)
      .values({ temaId: terceiroTema!.id, titulo: 'Reserva C', conteudo: 'Pronto.' })
      .returning()
    const [grupoC] = await banco.db.insert(grupos).values({ turmaId: grupoA.turmaId }).returning()

    await expect(
      atribuiEscopo(banco.db, terceiroEscopo!.id, grupoC!.id, {
        instrutorId: aluno!.id,
        formularioId: formulario!.id,
      }),
    ).rejects.toThrow(NaoAutorizado)

    // E a tentativa recusada não consumiu a reserva: a transação voltou inteira.
    expect(await escoposDeReserva(banco.db, curso.id)).toHaveLength(1)
  })
})
