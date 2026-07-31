import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import * as schema from './schema'
import {
  alunos,
  bancosDeTemas,
  blocos,
  blocosDeMaterial,
  cursos,
  dias,
  estruturas,
  formularios,
  grupos,
  julgamentosHumanos,
  marcos,
  materiaisDeReferencia,
  materiaisInterativos,
  niveisDeAvaliacao,
  obstaculos,
  papeisDaEstrutura,
  perguntasDoFormulario,
  regrasDeValidacao,
  repositorios,
  temas,
  turmas,
  usuarios,
} from './schema'

type Db = PgDatabase<PgQueryResultHKT, typeof schema>

/**
 * Dados de desenvolvimento. Nada aqui é regra: são valores de exemplo de um
 * curso fictício, e é por isso que aparecem juntos e nomeados neste bloco em
 * vez de espalhados pelo código.
 */
export const EXEMPLO = {
  curso: {
    nome: 'Curso de exemplo',
    tamanhoMaximoDeGrupo: 2,
    // `D1-PERGUNTA`. Texto de exemplo: a pergunta real é de cada curso.
    perguntaCondutora:
      'Como um sistema representa um negócio que muda de regra sem reescrever tudo?',
    // ADR 0005: a unidade da superação é escolha pedagógica, não fato da
    // plataforma. Este curso avalia por aluno — mesmo com os alunos em grupo, o
    // que se afere é o repositório de cada um. Com unidade `aluno` não existe
    // regra de agregação, e por isso o critério de grupo fica nulo.
    limiarDeAdiantamento: 0.8,
    unidadeDeSuperacao: 'aluno' as const,
    // O gabarito do Doc 6 §4.2 mostra dois itens em "o que não muda".
    minimoDeItensImutaveis: 2,
  },
  turma: { nome: 'Turma de exemplo' },
  /**
   * O formulário de escopo do curso de exemplo, e o portão do D3.
   *
   * Faltava inteiro: sem formulário, sem pergunta, sem regra, sem estrutura e
   * sem papel, a tela de escopo e a fila de aprovação não tinham o que abrir em
   * desenvolvimento — e são as duas telas do marco go/no-go.
   *
   * **Três perguntas e três papéis, de propósito.** O curso real tem outras
   * contagens, e um exemplo com as contagens dele convidaria a tratá-las como
   * padrão — o mesmo motivo pelo qual o calendário daqui é curto.
   *
   * As quatro formas de regra aparecem uma vez cada, porque é o que faz o
   * pré-filtro ser exercitável em desenvolvimento. Faixa, piso, referência
   * entre perguntas e lista negra têm caminhos diferentes no motor.
   */
  formulario: {
    nome: 'Formulário de escopo de exemplo',
    perguntas: [
      {
        ordem: 1,
        enunciado: 'Qual é o atendimento do seu domínio?',
        criterioDeAceite:
          'Uma frase que nomeia um evento com começo, fim e possibilidade de cancelamento. Cadastro e relatório não são atendimento.',
        regras: [
          { tipo: 'nao_vazio' as const, mensagem: 'Descreva o atendimento antes de entregar.' },
          {
            tipo: 'lista_negra' as const,
            // Configurável por curso: quais nomes contam como genéricos depende
            // do domínio, e uma lista em código envelheceria na primeira turma.
            termos: ['dados', 'gerenciador', 'objeto', 'item', 'info'],
            mensagem:
              'Há uma palavra genérica na resposta. Nomeie o que acontece no negócio, não a estrutura de software.',
          },
        ],
      },
      {
        ordem: 2,
        enunciado: 'Quais são os estados do atendimento, na ordem em que acontecem?',
        criterioDeAceite:
          'Um estado por linha, no vocabulário do negócio. Condição que dá para calcular olhando outros dados não é estado.',
        regras: [
          {
            tipo: 'contagem_de_itens' as const,
            minimo: 2,
            maximo: 4,
            mensagem: 'A quantidade de estados está fora da faixa que este curso aceita.',
          },
        ],
      },
      {
        ordem: 3,
        enunciado: 'Quais mudanças de estado o sistema precisa impedir?',
        criterioDeAceite:
          'Uma por linha, no formato origem → destino, com a razão de negócio. Os dois lados têm de ser estados que você declarou.',
        regras: [
          {
            tipo: 'referencia_declarada' as const,
            referenciaAOrdem: 2,
            mensagem:
              'Alguma mudança cita um estado que você não declarou. Use só os estados da pergunta anterior.',
          },
        ],
      },
    ],
    /**
     * O que só um humano decide (Doc 2 §4.6). É a lista que o instrutor percorre
     * na fila, e ela é dado porque quantos existem depende do formulário.
     */
    julgamentos: [
      { ordem: 1, enunciado: 'A resposta descreve um evento, e não um cadastro?', naOrdem: 1 },
      { ordem: 2, enunciado: 'As mudanças impedidas são realmente impossíveis, e não só raras?', naOrdem: 3 },
    ],
  },
  /**
   * A estrutura do curso e os papéis que a tabela de tradução cobre.
   *
   * Um deles é opcional, para desenvolvimento ter os dois casos: papel opcional
   * pode ficar de fora sem invalidar o escopo.
   */
  estrutura: {
    nome: 'Estrutura de exemplo',
    papeis: [
      { ordem: 1, nome: 'Quem solicita', obrigatorio: true },
      { ordem: 2, nome: 'O atendimento', obrigatorio: true },
      { ordem: 3, nome: 'Recurso escasso', obrigatorio: false },
    ],
  },
  instrutor: { githubUserId: 1000, githubLogin: 'instrutor-exemplo', nome: 'Instrutor' },
  // Rótulos de dificuldade são dado, não enum. Um deles é de trilha desafio
  // e por isso carrega briefing — sem ele o banco rejeita a linha.
  temas: [
    { nome: 'Tema fácil de exemplo', dificuldade: 'Fácil', trilha: 'padrao' as const },
    { nome: 'Tema médio de exemplo', dificuldade: 'Médio', trilha: 'padrao' as const },
    { nome: 'Tema difícil de exemplo', dificuldade: 'Difícil', trilha: 'padrao' as const },
    {
      nome: 'Tema de trilha desafio',
      dificuldade: 'Difícil',
      trilha: 'desafio' as const,
      briefing:
        'O que a organização faz · quem solicita e quem executa · etapas do atendimento · ' +
        'qual recurso é escasso · três categorias com tratamento diferente · vocabulário do setor.',
    },
  ],
  // Um grupo com dois alunos e um grupo solo — o solo é caso válido pelo
  // Doc 2 §2.4.1, não exceção. O primeiro já tem tema alocado, para que a
  // listagem de disponibilidade tenha os dois estados em desenvolvimento.
  grupos: [
    ['Ana', 'Bruno'],
    ['Carla'],
  ],
  // Material de referência: o espelho do instrutor, liberado por dia. Dois
  // dias diferentes de propósito, para desenvolvimento ter os dois estados —
  // liberado e ainda não liberado.
  referencias: [
    { ordemDeLiberacao: 1, titulo: 'Espelho do primeiro dia', url: 'https://github.com/instrutor-exemplo/espelho/tree/d1' },
    { ordemDeLiberacao: 3, titulo: 'Espelho do terceiro dia', url: 'https://github.com/instrutor-exemplo/espelho/tree/d3' },
  ],
  // A escala de avaliação deste curso de exemplo. São DADO (`D6-ESCALA`): os
  // quatro níveis e o descritor de cada um vêm do documento-dono, e é por isso
  // que estão aqui e não em `src/`.
  //
  // `contaComoSuperacao` é o que substitui o `>= 1` em código. Um curso que
  // resolva usar cinco níveis cadastra cinco linhas e marca as suas.
  niveisDeAvaliacao: [
    { valor: 0, descritor: 'Não superou o critério do obstáculo', contaComoSuperacao: false },
    { valor: 1, descritor: 'Superou com apoio direto do instrutor', contaComoSuperacao: true },
    { valor: 2, descritor: 'Superou de forma autônoma', contaComoSuperacao: true },
    {
      valor: 3,
      descritor: 'Superou e generalizou — pegou a extensão, ou aplicou em outro ponto sem pedido',
      contaComoSuperacao: true,
    },
  ],
  // O obstáculo É uma pergunta (`D3-07`), e o peso é configuração — um deles
  // pesa mais de propósito, para desenvolvimento ter os dois casos.
  obstaculos: [
    { ordem: 1, pergunta: 'Por que meu programa aceita um estado que não existe?', peso: 1 },
    { ordem: 2, pergunta: 'Por que consigo encerrar algo que já terminou?', peso: 1 },
    { ordem: 3, pergunta: 'Por que minha condicional não para de crescer?', peso: 2 },
  ],
  // Calendário curto de propósito: o número de dias é configuração, e um
  // exemplo com a contagem do curso real convidaria a tratá-la como padrão.
  dias: [
    {
      ordem: 1,
      blocos: [{ tipo: 'abertura', duracaoMinutos: 60 }],
      marco: null,
      // Lâminas de exemplo. A plataforma não gera conteúdo (Doc 7 §6): isto é
      // dado de desenvolvimento, para a tela de apresentação ter o que abrir.
      laminas: [
        {
          ordem: 1,
          titulo: 'Conversa de abertura',
          conteudo: `# Abertura\n\nO que este módulo é, e o que não é.`,
          /**
           * Blocos de exemplo, e a razão de existirem: sem eles nenhum dos nove
           * tipos tinha dado em desenvolvimento, e o modo apresentação não tinha
           * o que conduzir. Três tipos, escolhidos pelo que exercitam — um que
           * só desenha, um que registra resposta e libera agregado, e um que
           * segura gabarito até a submissão.
           *
           * `ocultoAteDiaId` fica nulo aqui: bloco que só aparece mais tarde é
           * caso do material real, e o seed não tem por que adivinhar qual.
           */
          blocos: [
            {
              ordem: 1,
              tipo: 'tese' as const,
              conteudo: `# O lugar onde o comportamento mora determina o custo da mudança\n\nNão existe abordagem melhor. Existe abordagem melhor para um tipo de problema.`,
              conteudoRevelado: null,
            },
            {
              ordem: 2,
              tipo: 'predicao' as const,
              conteudo: `> Quantos lugares do código você precisa abrir para atender esse pedido?\n\n- 1\n- 2\n- 3\n- mais de 3`,
              conteudoRevelado: `São quatro, e o critério acaba escrito em dois lugares.`,
            },
            {
              ordem: 3,
              tipo: 'classificador' as const,
              conteudo: `Classifique cada trecho na categoria dele.\n\n| # | Trecho |\n|---|---|\n| 1 | \`itens.filter(i => i.ativo)\` |\n| 2 | \`for (let i = 0; i < n; i++) {}\` |`,
              conteudoRevelado: `1 — funcional · 2 — imperativo`,
            },
          ],
        },
        {
          ordem: 2,
          titulo: 'Como o dia funciona',
          conteudo: `# Ritmo do dia\n\nOs blocos, e por que a ordem importa.`,
        },
        {
          ordem: 3,
          titulo: 'Fechamento',
          conteudo: `# Fechamento\n\nO que fica registrado e o que vem amanhã.`,
        },
      ],
    },
    {
      ordem: 2,
      blocos: [
        { tipo: 'abertura', duracaoMinutos: 20 },
        { tipo: 'tentativa', duracaoMinutos: 40 },
        { tipo: 'demonstracao', duracaoMinutos: 30 },
        { tipo: 'implementacao', duracaoMinutos: 75 },
        { tipo: 'fechamento', duracaoMinutos: 15 },
      ],
      marco: null,
      laminas: [],
    },
    {
      ordem: 3,
      blocos: [{ tipo: 'avaliacao', duracaoMinutos: 90 }],
      marco: { nome: 'Escopo aprovado', tipo: 'duro' as const },
      laminas: [],
    },
  ],
} as const

/**
 * Semeia o curso de exemplo, tudo ou nada.
 *
 * A transação não é zelo: o seed insere em quinze tabelas em sequência, e sem
 * ela uma falha no meio — um `github_user_id` que já existe, por exemplo —
 * deixa um curso pela metade no banco de desenvolvimento. Depois disso a
 * próxima execução falha por outro motivo, e quem está desenvolvendo perde a
 * tarde procurando o erro errado.
 */
export async function semeia(bancoOuTransacao: Db) {
  return bancoOuTransacao.transaction(async (db) => semeiaEm(db as Db))
}

async function semeiaEm(db: Db) {
  const [curso] = await db.insert(cursos).values(EXEMPLO.curso).returning()
  if (!curso) throw new Error('seed: curso não foi criado')

  const [turma] = await db
    .insert(turmas)
    .values({ cursoId: curso.id, nome: EXEMPLO.turma.nome })
    .returning()
  if (!turma) throw new Error('seed: turma não foi criada')

  await db
    .insert(niveisDeAvaliacao)
    .values(EXEMPLO.niveisDeAvaliacao.map((n) => ({ cursoId: curso.id, ...n })))

  await db.insert(obstaculos).values(EXEMPLO.obstaculos.map((o) => ({ cursoId: curso.id, ...o })))

  // Sem instrutor não há como abrir a área de instrutor em desenvolvimento.
  const [instrutor] = await db
    .insert(usuarios)
    .values({ ...EXEMPLO.instrutor, papel: 'instrutor' })
    .returning()
  if (!instrutor) throw new Error('seed: instrutor não foi criado')

  const diasPorOrdem = new Map<number, string>()

  for (const definicao of EXEMPLO.dias) {
    const [dia] = await db
      .insert(dias)
      .values({ cursoId: curso.id, ordem: definicao.ordem })
      .returning()
    if (!dia) throw new Error('seed: dia não foi criado')
    diasPorOrdem.set(definicao.ordem, dia.id)

    await db.insert(blocos).values(
      definicao.blocos.map((b, indice) => ({
        diaId: dia.id,
        ordem: indice + 1,
        tipo: b.tipo,
        duracaoMinutos: b.duracaoMinutos,
      })),
    )

    if (definicao.marco) {
      await db.insert(marcos).values({ diaId: dia.id, ...definicao.marco })
    }

    for (const definicaoDaLamina of definicao.laminas) {
      const { blocos: blocosDaLamina, ...lamina } = definicaoDaLamina as typeof definicaoDaLamina & {
        blocos?: readonly {
          ordem: number
          tipo: (typeof schema.tipoDeBlocoEnum.enumValues)[number]
          conteudo: string
          conteudoRevelado: string | null
        }[]
      }

      const [criada] = await db
        .insert(materiaisInterativos)
        .values({ diaId: dia.id, ...lamina })
        .returning()
      if (!criada) throw new Error('seed: lâmina não foi criada')

      if (blocosDaLamina && blocosDaLamina.length > 0) {
        await db
          .insert(blocosDeMaterial)
          .values(
            blocosDaLamina.map((b) => ({ materialInterativoId: criada.id, ...b })),
          )
      }
    }
  }

  // Depende dos dias já criados: o material de referência pendura no dia de
  // liberação, não no curso.
  for (const referencia of EXEMPLO.referencias) {
    const dia = diasPorOrdem.get(referencia.ordemDeLiberacao)
    if (!dia) throw new Error(`seed: dia ${referencia.ordemDeLiberacao} não existe`)
    await db.insert(materiaisDeReferencia).values({
      diaDeLiberacaoId: dia,
      titulo: referencia.titulo,
      url: referencia.url,
    })
  }

  // ── O portão do D3 ──────────────────────────────────────────────────
  const [formulario] = await db
    .insert(formularios)
    .values({ cursoId: curso.id, nome: EXEMPLO.formulario.nome })
    .returning()
  if (!formulario) throw new Error('seed: formulário não foi criado')

  const perguntasPorOrdem = new Map<number, string>()
  for (const definicao of EXEMPLO.formulario.perguntas) {
    const [pergunta] = await db
      .insert(perguntasDoFormulario)
      .values({
        formularioId: formulario.id,
        ordem: definicao.ordem,
        enunciado: definicao.enunciado,
        criterioDeAceite: definicao.criterioDeAceite,
      })
      .returning()
    if (!pergunta) throw new Error('seed: pergunta não foi criada')
    perguntasPorOrdem.set(definicao.ordem, pergunta.id)
  }

  // Em segunda passada: `referencia_declarada` aponta para outra pergunta, e
  // ela precisa já existir.
  for (const definicao of EXEMPLO.formulario.perguntas) {
    const perguntaId = perguntasPorOrdem.get(definicao.ordem)!
    for (const regra of definicao.regras) {
      const referencia =
        'referenciaAOrdem' in regra ? perguntasPorOrdem.get(regra.referenciaAOrdem) : undefined
      await db.insert(regrasDeValidacao).values({
        perguntaId,
        tipo: regra.tipo,
        minimo: 'minimo' in regra ? regra.minimo : null,
        maximo: 'maximo' in regra ? regra.maximo : null,
        perguntaDeReferenciaId: referencia ?? null,
        termos: 'termos' in regra ? [...regra.termos] : null,
        mensagem: regra.mensagem,
      })
    }
  }

  await db.insert(julgamentosHumanos).values(
    EXEMPLO.formulario.julgamentos.map((j) => ({
      formularioId: formulario.id,
      ordem: j.ordem,
      enunciado: j.enunciado,
      perguntaId: perguntasPorOrdem.get(j.naOrdem) ?? null,
    })),
  )

  const [estrutura] = await db
    .insert(estruturas)
    .values({ cursoId: curso.id, nome: EXEMPLO.estrutura.nome })
    .returning()
  if (!estrutura) throw new Error('seed: estrutura não foi criada')

  await db
    .insert(papeisDaEstrutura)
    .values(EXEMPLO.estrutura.papeis.map((p) => ({ estruturaId: estrutura.id, ...p })))

  const [bancoDeTemas] = await db
    .insert(bancosDeTemas)
    .values({ cursoId: curso.id, nome: 'Banco de exemplo' })
    .returning()
  if (!bancoDeTemas) throw new Error('seed: banco de temas não foi criado')

  const temasCriados = await db
    .insert(temas)
    .values(EXEMPLO.temas.map((t) => ({ ...t, bancoDeTemasId: bancoDeTemas.id })))
    .returning()

  let proximoGithubId = 1

  for (const [indiceDoGrupo, integrantes] of EXEMPLO.grupos.entries()) {
    // Só o primeiro grupo recebe tema, para a listagem de disponibilidade ter
    // os dois estados em desenvolvimento.
    const temaId = indiceDoGrupo === 0 ? (temasCriados[0]?.id ?? null) : null

    const [grupo] = await db
      .insert(grupos)
      .values({ turmaId: turma.id, temaId })
      .returning()
    if (!grupo) throw new Error('seed: grupo não foi criado')

    for (const [indice, nome] of integrantes.entries()) {
      const [usuario] = await db
        .insert(usuarios)
        .values({
          githubUserId: proximoGithubId++,
          githubLogin: nome.toLowerCase(),
          nome,
          papel: 'aluno',
        })
        .returning()
      if (!usuario) throw new Error('seed: usuário não foi criado')

      const [aluno] = await db
        .insert(alunos)
        .values({
          turmaId: turma.id,
          usuarioId: usuario.id,
          grupoId: grupo.id,
          posicaoNoGrupo: indice + 1,
        })
        .returning()
      if (!aluno) throw new Error('seed: aluno não foi criado')

      // Repositório é individual mesmo dentro do grupo (Doc 5 §6).
      await db.insert(repositorios).values({
        alunoId: aluno.id,
        url: `https://github.com/${nome.toLowerCase()}/projeto-de-exemplo`,
      })
    }
  }

  return {
    cursoId: curso.id,
    turmaId: turma.id,
    instrutorId: instrutor.id,
    bancoDeTemasId: bancoDeTemas.id,
  }
}
