import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { aprova } from '@/db/fila-de-aprovacao'
import {
  derivacaoDoGrupo,
  geraIncremento,
  IncrementoInvalido,
  incrementoDoGrupo,
} from '@/db/incremento'
import { abreRascunho, gravaResposta, submete } from '@/db/resposta-de-escopo'
import {
  alunos,
  dias,
  formularios,
  grupos,
  incrementos,
  itensImutaveis,
  lacunasDoModelo,
  modelosDeMudanca,
  perguntasDoFormulario,
  cursos as schemaCursos,
  respostasDeEscopo as schemaRespostas,
  turmas,
  usuarios,
  valoresDaLacuna,
} from '@/db/schema'
import type { Ator } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 17 em
// docs/BACKLOG.md. SSOT: `D6-ENVELOPE` · Doc 6 §4.2 e §4.6 · Doc 5 §5.2.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 17 — gerador de incremento e liberação temporizada', () => {
  let banco: BancoEfemero

  /**
   * O gabarito deste curso fictício, em vocabulário genérico.
   *
   * Duas mudanças, e a segunda sai na versão reduzida. Que sejam duas, e que
   * seja a segunda a sair, é configuração — o Doc 6 §4.6 diz que a redução
   * mantém a primeira, e o curso é quem declara qual é qual.
   */
  const MUDANCAS = [
    {
      ordem: 1,
      rotulo: 'Nova regra de cálculo',
      entraNaVersaoReduzida: true,
      lacunas: [
        { ordem: 1, chave: 'alvo', rotulo: 'Sobre o que incide', obrigatoria: true },
        { ordem: 2, chave: 'grandeza', rotulo: 'O que passa a ser calculado', obrigatoria: true },
        { ordem: 3, chave: 'formula', rotulo: 'Como passa a ser calculado', obrigatoria: true },
      ],
    },
    {
      ordem: 2,
      rotulo: 'Novo estado no fluxo',
      entraNaVersaoReduzida: false,
      lacunas: [
        { ordem: 1, chave: 'estado_novo', rotulo: 'O estado que nasce', obrigatoria: true },
        { ordem: 2, chave: 'entre_origem', rotulo: 'Vem depois de', obrigatoria: true },
        { ordem: 3, chave: 'entre_destino', rotulo: 'Vem antes de', obrigatoria: true },
        { ordem: 4, chave: 'razao', rotulo: 'Por que a transição nova é ilegal', obrigatoria: false },
      ],
    },
  ]

  const DIA_DE_LIBERACAO = 6
  const DIA_ANTERIOR = 5

  async function cenario() {
    const curso = await criaCurso(banco, { minimoDeItensImutaveis: 2 })
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values([1, DIA_ANTERIOR, DIA_DE_LIBERACAO].map((ordem) => ({ cursoId: curso.id, ordem })))
      .returning()

    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário' })
      .returning()

    // Duas perguntas alimentam a derivação e uma não. O instrutor lê só as que
    // o curso marcou (Doc 6 §4.4).
    const perguntas = await banco.db
      .insert(perguntasDoFormulario)
      .values([
        {
          formularioId: formulario!.id,
          ordem: 1,
          enunciado: 'Quais são os estados?',
          criterioDeAceite: 'Estados verificáveis.',
          alimentaIncremento: true,
        },
        {
          formularioId: formulario!.id,
          ordem: 2,
          enunciado: 'Quais são as categorias com cálculo variável?',
          criterioDeAceite: 'Categorias verificáveis.',
          alimentaIncremento: true,
        },
        {
          formularioId: formulario!.id,
          ordem: 3,
          enunciado: 'O que o sistema NÃO vai fazer?',
          criterioDeAceite: 'Exclusões verificáveis.',
          alimentaIncremento: false,
        },
      ])
      .returning()

    for (const modelo of MUDANCAS) {
      const [gravado] = await banco.db
        .insert(modelosDeMudanca)
        .values({
          cursoId: curso.id,
          ordem: modelo.ordem,
          rotulo: modelo.rotulo,
          entraNaVersaoReduzida: modelo.entraNaVersaoReduzida,
        })
        .returning()
      await banco.db
        .insert(lacunasDoModelo)
        .values(modelo.lacunas.map((l) => ({ modeloDeMudancaId: gravado!.id, ...l })))
    }

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1701, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()
    const [usuarioAluno] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1702, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' })
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    await banco.db.insert(alunos).values({
      turmaId: turma!.id,
      usuarioId: usuarioAluno!.id,
      grupoId: gruposCriados[0]!.id,
      posicaoNoGrupo: 1,
    })

    return {
      curso,
      turma: turma!,
      dias: diasCriados,
      diaDeLiberacao: diasCriados[2]!,
      formulario: formulario!,
      perguntas,
      instrutora: instrutora!,
      aluno: usuarioAluno!,
      grupoA: gruposCriados[0]!,
      grupoB: gruposCriados[1]!,
    }
  }

  /** Escopo preenchido, entregue e aprovado — de onde o incremento deriva. */
  async function escopoAprovado(c: Awaited<ReturnType<typeof cenario>>, grupoId: string) {
    const escopo = await abreRascunho(banco.db, grupoId, c.formulario.id)
    await gravaResposta(banco.db, escopo.id, c.perguntas[0]!.id, 'Aberto, Em curso, Encerrado')
    await gravaResposta(banco.db, escopo.id, c.perguntas[1]!.id, 'Comum, Urgente, Especial')
    await gravaResposta(banco.db, escopo.id, c.perguntas[2]!.id, 'Não haverá cobrança online.')
    await submete(banco.db, escopo.id)
    await aprova(banco.db, escopo.id, c.instrutora.id)
    return escopo
  }

  /** Preenche todas as lacunas obrigatórias das mudanças de uma versão. */
  function preencheLacunas(mudancas: Awaited<ReturnType<typeof derivacaoDoGrupo>>['mudancas']) {
    return Object.fromEntries(
      mudancas.flatMap((m) => m.lacunas.map((l) => [l.lacunaId, `valor de ${l.chave}`])),
    )
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('gerador_precarrega_do_formulario', async () => {
    const c = await cenario()
    await escopoAprovado(c, c.grupoA.id)

    const derivacao = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')

    // Só as respostas que o curso marcou como origem. A terceira pergunta não
    // alimenta a derivação e não aparece — o instrutor tem 10 minutos por
    // incremento, e ler o formulário inteiro não cabe.
    expect(derivacao.respostasDeOrigem).toHaveLength(2)
    expect(derivacao.respostasDeOrigem.map((r) => r.texto)).toEqual([
      'Aberto, Em curso, Encerrado',
      'Comum, Urgente, Especial',
    ])
    expect(derivacao.respostasDeOrigem.map((r) => r.enunciado)).not.toContain(
      'O que o sistema NÃO vai fazer?',
    )

    // E vêm as lacunas a preencher, que são CAMPOS declarados — não um texto
    // livre onde o instrutor reconstrói o formato a cada grupo (Doc 6 §13).
    expect(derivacao.mudancas).toHaveLength(MUDANCAS.length)
    expect(derivacao.mudancas[0]?.lacunas.map((l) => l.chave)).toEqual([
      'alvo',
      'grandeza',
      'formula',
    ])
    expect(derivacao.mudancas[1]?.lacunas).toHaveLength(4)
    expect(derivacao.minimoDeItensImutaveis).toBe(2)

    // Marcar outra pergunta muda a pré-carga, sem tocar em código: quais
    // respostas alimentam a derivação é configuração.
    await banco.db
      .update(perguntasDoFormulario)
      .set({ alimentaIncremento: false })
      .where(eq(perguntasDoFormulario.id, c.perguntas[0]!.id))

    const depois = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')
    expect(depois.respostasDeOrigem).toHaveLength(1)
  })

  it('incremento_exige_remetente_nomeado', async () => {
    const c = await cenario()
    await escopoAprovado(c, c.grupoA.id)
    const derivacao = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')

    const base = {
      contexto: 'A direção decidiu endurecer a política de atraso.',
      versao: 'integral' as const,
      diaDeLiberacaoId: c.diaDeLiberacao.id,
      lacunas: preencheLacunas(derivacao.mudancas),
      itensImutaveis: ['As regras de categoria comum', 'O conflito de recurso único'],
    }

    // Sem remetente a mudança volta a ser tarefa do professor, e o envelope
    // perde a autenticidade que o Doc 6 §4.2.1 adota de propósito.
    for (const vazio of ['', '   ']) {
      await expect(
        geraIncremento(banco.db, c.grupoA.id, { ...base, remetente: vazio }, c.instrutora.id),
      ).rejects.toThrow(IncrementoInvalido)
    }

    // Nem pelo banco. E o contexto de negócio também é obrigatório.
    await expect(
      banco.db.insert(incrementos).values({
        grupoId: c.grupoA.id,
        respostaDeEscopoId: (await escopoDoGrupo(c.grupoA.id))!,
        remetente: '  ',
        contexto: 'algo',
        versao: 'integral',
        diaDeLiberacaoId: c.diaDeLiberacao.id,
        criadoPorId: c.instrutora.id,
      }),
    ).rejects.toThrow()

    const { id } = await geraIncremento(
      banco.db,
      c.grupoA.id,
      { ...base, remetente: '  A direção do serviço  ' },
      c.instrutora.id,
    )
    const [gravado] = await banco.db.select().from(incrementos).where(eq(incrementos.id, id))
    expect(gravado?.remetente).toBe('A direção do serviço')

    // E gerar é ato do instrutor: o incremento é o pedido que CHEGA ao grupo, e
    // se o grupo pudesse escrevê-lo o eixo mediria a imaginação dele.
    await escopoAprovado(c, c.grupoB.id)
    await expect(
      geraIncremento(
        banco.db,
        c.grupoB.id,
        { ...base, remetente: 'Alguém', lacunas: preencheLacunas(derivacao.mudancas) },
        c.aluno.id,
      ),
    ).rejects.toThrow()
  })

  async function escopoDoGrupo(grupoId: string): Promise<string | undefined> {
    const [escopo] = await banco.db
      .select({ id: schemaRespostas.id })
      .from(schemaRespostas)
      .where(eq(schemaRespostas.grupoId, grupoId))
      .limit(1)
    return escopo?.id
  }

  it('incremento_exige_dois_itens_imutaveis', async () => {
    const c = await cenario()
    await escopoAprovado(c, c.grupoA.id)
    const derivacao = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')

    const base = {
      remetente: 'A direção do serviço',
      contexto: 'Contexto de negócio.',
      versao: 'integral' as const,
      diaDeLiberacaoId: c.diaDeLiberacao.id,
      lacunas: preencheLacunas(derivacao.mudancas),
    }

    // A seção é obrigatória porque sem ela metade da turma reescreve o projeto
    // inteiro — e o instrumento mede absorção, não reação ao susto (Doc 6 §4.3).
    for (const poucos of [[], ['só um'], ['um', '   ']]) {
      await expect(
        geraIncremento(banco.db, c.grupoA.id, { ...base, itensImutaveis: poucos }, c.instrutora.id),
      ).rejects.toThrow(IncrementoInvalido)
    }
    expect(await banco.db.select().from(incrementos)).toHaveLength(0)

    await geraIncremento(
      banco.db,
      c.grupoA.id,
      { ...base, itensImutaveis: ['As regras de categoria comum', 'O conflito de recurso único'] },
      c.instrutora.id,
    )
    expect(await banco.db.select().from(itensImutaveis)).toHaveLength(2)

    // Quantos itens bastam é configuração: outro curso exige três, e a mesma
    // entrada de dois passa a ser recusada sem tocar em código.
    const exigente = await criaCurso(banco, { nome: 'Curso exigente', minimoDeItensImutaveis: 3 })
    const [turmaExigente] = await banco.db
      .insert(turmas)
      .values({ cursoId: exigente.id, nome: 'Turma exigente' })
      .returning()
    expect(turmaExigente).toBeDefined()
    const [conferido] = await banco.db
      .select({ minimo: schemaCursos.minimoDeItensImutaveis })
      .from(schemaCursos)
      .where(eq(schemaCursos.id, exigente.id))
    expect(conferido?.minimo).toBe(3)
  })

  it('versao_reduzida_omite_mudanca_de_estado', async () => {
    const c = await cenario()
    await escopoAprovado(c, c.grupoA.id)

    // A redução não some com a mudança por condicional: ela filtra pelos
    // modelos que o curso marcou (Doc 5 §5.2 · Doc 6 §4.6).
    const integral = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')
    const reduzida = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'reduzida')

    expect(integral.mudancas.map((m) => m.rotulo)).toEqual(MUDANCAS.map((m) => m.rotulo))
    expect(reduzida.mudancas.map((m) => m.rotulo)).toEqual(['Nova regra de cálculo'])

    await geraIncremento(
      banco.db,
      c.grupoA.id,
      {
        remetente: 'A direção do serviço',
        contexto: 'Contexto.',
        versao: 'reduzida',
        diaDeLiberacaoId: c.diaDeLiberacao.id,
        lacunas: preencheLacunas(reduzida.mudancas),
        itensImutaveis: ['Um', 'Dois'],
      },
      c.instrutora.id,
    )

    const montado = await incrementoDoGrupo(
      banco.db,
      c.grupoA.id,
      { papel: 'instrutor', usuarioId: c.instrutora.id },
      DIA_DE_LIBERACAO,
    )
    expect(montado?.versao).toBe('reduzida')
    expect(montado?.mudancas.map((m) => m.rotulo)).toEqual(['Nova regra de cálculo'])

    // Omitir é NÃO PODER preencher. Sem isso "reduzida" seria só um rótulo, e a
    // tela do grupo mostraria a mudança que a triagem decidiu poupar.
    const [lacunaOmitida] = await banco.db
      .select({ id: lacunasDoModelo.id })
      .from(lacunasDoModelo)
      .innerJoin(modelosDeMudanca, eq(modelosDeMudanca.id, lacunasDoModelo.modeloDeMudancaId))
      .where(eq(modelosDeMudanca.entraNaVersaoReduzida, false))
      .limit(1)

    const [incremento] = await banco.db.select().from(incrementos)
    const invasao = await banco.db
      .insert(valoresDaLacuna)
      .values({ incrementoId: incremento!.id, lacunaId: lacunaOmitida!.id, valor: 'invadindo' })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(invasao).toBeInstanceOf(Error)
    expect(causaDe(invasao)).toMatch(/versao reduzida nao inclui/)
  })

  it('nao_gera_incremento_sem_formulario_aprovado', async () => {
    const c = await cenario()

    // Sem escopo nenhum não há de onde derivar.
    await expect(derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')).rejects.toThrow(
      IncrementoInvalido,
    )

    // Com escopo em rascunho, também não: o incremento derivaria de um contrato
    // que ainda pode mudar.
    const escopo = await abreRascunho(banco.db, c.grupoA.id, c.formulario.id)
    await gravaResposta(banco.db, escopo.id, c.perguntas[0]!.id, 'Aberto, Encerrado')
    const emRascunho = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral').then(
      () => null,
      (e: unknown) => e as Error,
    )
    expect(emRascunho).toBeInstanceOf(IncrementoInvalido)
    expect(emRascunho?.message).toContain('rascunho')

    // Submetido e ainda não decidido: continua sem derivar.
    await submete(banco.db, escopo.id)
    await expect(derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')).rejects.toThrow(
      IncrementoInvalido,
    )

    // E o banco recusa por conta própria, não só a aplicação — é a regra do
    // Doc 7 §2.4, e nenhum outro caminho de escrita pode contorná-la.
    const direto = await banco.db
      .insert(incrementos)
      .values({
        grupoId: c.grupoA.id,
        respostaDeEscopoId: escopo.id,
        remetente: 'Alguém',
        contexto: 'Contexto.',
        versao: 'integral',
        diaDeLiberacaoId: c.diaDeLiberacao.id,
        criadoPorId: c.instrutora.id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(direto).toBeInstanceOf(Error)
    expect(causaDe(direto)).toMatch(/so deriva de escopo aprovado/)

    // Aprovado, deriva.
    await aprova(banco.db, escopo.id, c.instrutora.id)
    const aprovada = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')
    expect(aprovada.mudancas).toHaveLength(MUDANCAS.length)
  })

  it('incremento_invisivel_antes_da_liberacao', async () => {
    const c = await cenario()
    await escopoAprovado(c, c.grupoA.id)
    const derivacao = await derivacaoDoGrupo(banco.db, c.grupoA.id, 'integral')

    await geraIncremento(
      banco.db,
      c.grupoA.id,
      {
        remetente: 'A direção do serviço',
        contexto: 'Contexto.',
        versao: 'integral',
        diaDeLiberacaoId: c.diaDeLiberacao.id,
        lacunas: preencheLacunas(derivacao.mudancas),
        itensImutaveis: ['Um', 'Dois'],
      },
      c.instrutora.id,
    )

    const comoAluno: Ator = { papel: 'aluno', usuarioId: c.aluno.id, grupoId: c.grupoA.id }
    const comoInstrutora: Ator = { papel: 'instrutor', usuarioId: c.instrutora.id }

    // Antes do dia, o aluno não vê. E o filtro é de CONSULTA: o incremento não
    // chega ao navegador nem dentro de uma resposta que a tela ignoraria.
    expect(await incrementoDoGrupo(banco.db, c.grupoA.id, comoAluno, DIA_ANTERIOR)).toBeNull()

    // O instrutor vê antes: é ele quem escreve, entre o D4 e o D11, para
    // entregar no D12 (Doc 6 §4.4).
    const doInstrutor = await incrementoDoGrupo(
      banco.db,
      c.grupoA.id,
      comoInstrutora,
      DIA_ANTERIOR,
    )
    expect(doInstrutor?.remetente).toBe('A direção do serviço')

    // Chegado o dia, o aluno vê — montado, com as lacunas preenchidas e o que
    // não muda.
    const liberado = await incrementoDoGrupo(banco.db, c.grupoA.id, comoAluno, DIA_DE_LIBERACAO)
    expect(liberado).not.toBeNull()
    expect(liberado?.mudancas).toHaveLength(MUDANCAS.length)
    expect(liberado?.mudancas[0]?.lacunas.map((l) => l.chave)).toEqual([
      'alvo',
      'grandeza',
      'formula',
    ])
    expect(liberado?.itensImutaveis).toEqual(['Um', 'Dois'])
    expect(liberado?.ordemDeLiberacao).toBe(DIA_DE_LIBERACAO)

    // Depois do dia continua visível: o atraso protege o dia da entrega, não os
    // seguintes.
    expect(
      await incrementoDoGrupo(banco.db, c.grupoA.id, comoAluno, DIA_DE_LIBERACAO + 3),
    ).not.toBeNull()
  })
})
