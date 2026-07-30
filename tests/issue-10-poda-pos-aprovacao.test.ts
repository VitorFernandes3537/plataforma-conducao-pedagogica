import { and, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alocaTema } from '@/db/alocacao'
import { aprova, NaoAutorizado } from '@/db/fila-de-aprovacao'
import { historicoDePodas, poda, PodaInvalida } from '@/db/poda'
import { abreRascunho, EscopoInvalido, gravaResposta, submete } from '@/db/resposta-de-escopo'
import {
  bancosDeTemas,
  formularios,
  grupos,
  perguntasDoFormulario,
  podas,
  respostasDePergunta,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 10 em
// docs/BACKLOG.md. SSOT: Doc 2 §4.5.1 · Doc 5 §5.3.

const ESCOPO_ORIGINAL = ['Cadastro', 'Reserva', 'Cancelamento', 'Relatório'].join(
  String.fromCharCode(10),
)
const ESCOPO_PODADO = ['Cadastro', 'Reserva'].join(String.fromCharCode(10))

describe('Issue 10 — edição pós-aprovação restrita a poda', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário' })
      .returning()
    const perguntas = await banco.db
      .insert(perguntasDoFormulario)
      .values([
        {
          formularioId: formulario!.id,
          ordem: 1,
          enunciado: 'Liste as operações.',
          criterioDeAceite: 'Operações verificáveis.',
        },
        {
          formularioId: formulario!.id,
          ordem: 2,
          enunciado: 'Liste as exclusões.',
          criterioDeAceite: 'Exclusões verificáveis.',
        },
      ])
      .returning()

    const pessoas = await banco.db
      .insert(usuarios)
      .values([
        { githubUserId: 8001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' },
        { githubUserId: 8002, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' },
      ])
      .returning()

    const [bancoDeTemas] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()
    const [tema] = await banco.db
      .insert(temas)
      .values({
        bancoDeTemasId: bancoDeTemas!.id,
        nome: 'Tema A',
        dificuldade: 'Difícil',
        trilha: 'padrao',
      })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()
    await alocaTema(banco.db, grupo!.id, tema!.id)

    return {
      curso,
      turma: turma!,
      formulario: formulario!,
      primeira: perguntas[0]!,
      segunda: perguntas[1]!,
      instrutora: pessoas[0]!,
      aluno: pessoas[1]!,
      tema: tema!,
      grupo: grupo!,
    }
  }

  /** Escopo entregue e aprovado, que é onde a poda começa a existir. */
  async function escopoAprovado(c: Awaited<ReturnType<typeof cenario>>) {
    const escopo = await abreRascunho(banco.db, c.grupo.id, c.formulario.id)
    await gravaResposta(banco.db, escopo.id, c.primeira.id, ESCOPO_ORIGINAL)
    await gravaResposta(banco.db, escopo.id, c.segunda.id, 'Nenhuma exclusão.')
    await submete(banco.db, escopo.id)
    await aprova(banco.db, escopo.id, c.instrutora.id)
    return escopo
  }

  async function textoDe(escopoId: string, perguntaId: string): Promise<string | undefined> {
    const [linha] = await banco.db
      .select({ texto: respostasDePergunta.texto })
      .from(respostasDePergunta)
      .where(
        and(
          eq(respostasDePergunta.respostaDeEscopoId, escopoId),
          eq(respostasDePergunta.perguntaId, perguntaId),
        ),
      )
    return linha?.texto
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('edicao_pos_aprovacao_exige_motivo_poda', async () => {
    const c = await cenario()
    const escopo = await escopoAprovado(c)

    // Sem motivo escrito não há poda: vazio e espaço são a mesma coisa.
    for (const nada of ['', '   ']) {
      await expect(
        poda(banco.db, escopo.id, c.instrutora.id, nada, [
          { perguntaId: c.primeira.id, texto: ESCOPO_PODADO },
        ]),
      ).rejects.toThrow(PodaInvalida)
    }
    expect(await textoDe(escopo.id, c.primeira.id)).toBe(ESCOPO_ORIGINAL)

    // E não há caminho de edição fora da poda. O gatilho exige o id de uma poda
    // desta resposta: sem ele, nem UPDATE direto passa.
    await expect(
      banco.db
        .update(respostasDePergunta)
        .set({ texto: ESCOPO_PODADO })
        .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id)),
    ).rejects.toThrow()

    // Nem apresentando a poda de OUTRO escopo.
    const [outroGrupo] = await banco.db.insert(grupos).values({ turmaId: c.turma.id }).returning()
    const outroEscopo = await abreRascunho(banco.db, outroGrupo!.id, c.formulario.id)
    await gravaResposta(banco.db, outroEscopo.id, c.primeira.id, 'Outro escopo')
    await submete(banco.db, outroEscopo.id)
    await aprova(banco.db, outroEscopo.id, c.instrutora.id)
    const alheia = await poda(banco.db, outroEscopo.id, c.instrutora.id, 'Poda do outro grupo.', [
      { perguntaId: c.primeira.id, texto: 'Reduzido' },
    ])

    await expect(
      banco.db.transaction(async (tx) => {
        await tx.execute(`set local pcp.poda_autorizada = '${alheia.podaId}'`)
        await tx
          .update(respostasDePergunta)
          .set({ texto: 'invadindo' })
          .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id))
      }),
    ).rejects.toThrow()
    expect(await textoDe(escopo.id, c.primeira.id)).toBe(ESCOPO_ORIGINAL)

    // Com motivo, poda. O motivo fica registrado com quem podou.
    const { podaId } = await poda(
      banco.db,
      escopo.id,
      c.instrutora.id,
      '  Rebaixamento de trilha: sai relatório e cancelamento.  ',
      [{ perguntaId: c.primeira.id, texto: ESCOPO_PODADO }],
    )

    const [registro] = await banco.db.select().from(podas).where(eq(podas.id, podaId))
    expect(registro?.motivo).toBe('Rebaixamento de trilha: sai relatório e cancelamento.')
    expect(registro?.podadoPorId).toBe(c.instrutora.id)
    expect(await textoDe(escopo.id, c.primeira.id)).toBe(ESCOPO_PODADO)
  })

  it('aluno_nao_edita_aprovado', async () => {
    const c = await cenario()
    const escopo = await escopoAprovado(c)

    // Pelo caminho do grupo, recusa com frase.
    await expect(
      gravaResposta(banco.db, escopo.id, c.primeira.id, 'ampliando o escopo'),
    ).rejects.toThrow(EscopoInvalido)

    // E o aluno não vira instrutor por chamar a função de poda: podar é ato do
    // instrutor, como aprovar e devolver.
    await expect(
      poda(banco.db, escopo.id, c.aluno.id, 'quero mudar', [
        { perguntaId: c.primeira.id, texto: ESCOPO_PODADO },
      ]),
    ).rejects.toThrow(NaoAutorizado)

    expect(await textoDe(escopo.id, c.primeira.id)).toBe(ESCOPO_ORIGINAL)
    expect(await historicoDePodas(banco.db, escopo.id)).toHaveLength(0)
  })

  it('poda_preserva_o_tema', async () => {
    const c = await cenario()
    const escopo = await escopoAprovado(c)

    const antes = await banco.db.select().from(grupos).where(eq(grupos.id, c.grupo.id))
    expect(antes[0]?.temaId).toBe(c.tema.id)

    await poda(banco.db, escopo.id, c.instrutora.id, 'Reduz para a trilha padrão.', [
      { perguntaId: c.primeira.id, texto: ESCOPO_PODADO },
    ])

    // Rebaixamento é poda, não troca de tema (Doc 5 §5.3). O tema segue o mesmo
    // — e a função de poda nem alcança `grupos`, então não há como errar aqui
    // sem mudar a assinatura.
    const depois = await banco.db.select().from(grupos).where(eq(grupos.id, c.grupo.id))
    expect(depois[0]?.temaId).toBe(c.tema.id)

    // Podar não responde pergunta em branco: seria ampliar escopo pela porta da
    // exceção, que é o oposto de reduzir.
    const [terceira] = await banco.db
      .insert(perguntasDoFormulario)
      .values({
        formularioId: c.formulario.id,
        ordem: 3,
        enunciado: 'Liste os riscos.',
        criterioDeAceite: 'Riscos verificáveis.',
      })
      .returning()

    await expect(
      poda(banco.db, escopo.id, c.instrutora.id, 'acrescentando', [
        { perguntaId: terceira!.id, texto: 'Risco novo' },
      ]),
    ).rejects.toThrow(PodaInvalida)
  })

  it('poda_preserva_versao_anterior', async () => {
    const c = await cenario()
    const escopo = await escopoAprovado(c)

    const primeira = await poda(
      banco.db,
      escopo.id,
      c.instrutora.id,
      'Sai relatório e cancelamento.',
      [{ perguntaId: c.primeira.id, texto: ESCOPO_PODADO }],
    )

    const umaPoda = await historicoDePodas(banco.db, escopo.id)
    expect(umaPoda).toHaveLength(1)
    expect(umaPoda[0]?.podaId).toBe(primeira.podaId)
    expect(umaPoda[0]?.motivo).toBe('Sai relatório e cancelamento.')

    // O histórico guarda o que estava escrito ANTES, incluindo as respostas que
    // a poda não tocou: é a versão inteira que serve de comparação.
    const guardadas = new Map(umaPoda[0]!.respostas.map((r) => [r.perguntaId, r.texto]))
    expect(guardadas.get(c.primeira.id)).toBe(ESCOPO_ORIGINAL)
    expect(guardadas.get(c.segunda.id)).toBe('Nenhuma exclusão.')

    // E o vigente é o novo. As duas versões coexistem, que é o ponto.
    expect(await textoDe(escopo.id, c.primeira.id)).toBe(ESCOPO_PODADO)

    // Segunda poda empilha, não sobrescreve: cada redução deixa seu registro.
    await poda(banco.db, escopo.id, c.instrutora.id, 'Sai reserva também.', [
      { perguntaId: c.primeira.id, texto: 'Cadastro' },
    ])

    const duas = await historicoDePodas(banco.db, escopo.id)
    expect(duas).toHaveLength(2)
    expect(duas.map((p) => p.motivo)).toEqual([
      'Sai relatório e cancelamento.',
      'Sai reserva também.',
    ])
    expect(duas[1]?.respostas.find((r) => r.perguntaId === c.primeira.id)?.texto).toBe(
      ESCOPO_PODADO,
    )
    expect(await textoDe(escopo.id, c.primeira.id)).toBe('Cadastro')
  })

  it('poda_so_existe_depois_da_aprovacao', async () => {
    // Antes da aprovação o caminho normal é editar e reenviar. Deixar podar um
    // rascunho criaria dois jeitos de fazer a mesma coisa, e o histórico de
    // podas passaria a registrar edição comum.
    const c = await cenario()
    const escopo = await abreRascunho(banco.db, c.grupo.id, c.formulario.id)
    await gravaResposta(banco.db, escopo.id, c.primeira.id, ESCOPO_ORIGINAL)

    await expect(
      poda(banco.db, escopo.id, c.instrutora.id, 'motivo', [
        { perguntaId: c.primeira.id, texto: ESCOPO_PODADO },
      ]),
    ).rejects.toThrow(PodaInvalida)

    await submete(banco.db, escopo.id)
    await expect(
      poda(banco.db, escopo.id, c.instrutora.id, 'motivo', [
        { perguntaId: c.primeira.id, texto: ESCOPO_PODADO },
      ]),
    ).rejects.toThrow(PodaInvalida)

    expect(await historicoDePodas(banco.db, escopo.id)).toHaveLength(0)
  })

  it('poda_recusada_nao_deixa_registro_pela_metade', async () => {
    // A poda grava histórico ANTES de autorizar a escrita. Se a escrita falhar,
    // a transação tem de voltar inteira — histórico de uma poda que não
    // aconteceu faria o instrutor comparar contra uma versão inexistente.
    const c = await cenario()
    const escopo = await escopoAprovado(c)

    await expect(
      poda(banco.db, escopo.id, c.instrutora.id, 'motivo', []),
    ).rejects.toThrow(PodaInvalida)

    expect(await historicoDePodas(banco.db, escopo.id)).toHaveLength(0)
    expect(await banco.db.select().from(podas)).toHaveLength(0)
  })
})
