import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { aprovadoNoPreFiltro, valida, type Regra } from '@/domain/validacao'

// Nomes vindos literalmente dos critérios de aceite da issue 7 em
// docs/BACKLOG.md. SSOT: Doc 2 §4.6.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/** Quebra de linha: o motor lê um item por linha (convenção de formato). */
const NL = String.fromCharCode(10)

/** Regra com os campos nulos preenchidos — o teste só declara o que importa. */
function regra(parcial: Partial<Regra> & Pick<Regra, 'perguntaId' | 'tipo' | 'mensagem'>): Regra {
  return {
    minimo: null,
    maximo: null,
    perguntaDeReferenciaId: null,
    termos: null,
    ...parcial,
  }
}

describe('Issue 7 — motor de validação automática', () => {
  it('rejeita_pergunta_em_branco', () => {
    const regras = [
      regra({ perguntaId: 'p1', tipo: 'nao_vazio', mensagem: 'Responda a primeira pergunta.' }),
      regra({ perguntaId: 'p2', tipo: 'nao_vazio', mensagem: 'Responda a segunda pergunta.' }),
    ]

    // Respondida, em branco, e só espaço em branco — os três casos.
    const reprovacoes = valida(
      [
        { perguntaId: 'p1', texto: 'Um atendimento de corte de cabelo.' },
        { perguntaId: 'p2', texto: '   \n  ' },
      ],
      regras,
    )

    expect(reprovacoes).toHaveLength(1)
    expect(reprovacoes[0]?.perguntaId).toBe('p2')
    // A mensagem vem da configuração, não do motor: quem configurou a pergunta
    // escreve o que o aluno lê.
    expect(reprovacoes[0]?.mensagem).toBe('Responda a segunda pergunta.')
    expect(aprovadoNoPreFiltro(reprovacoes)).toBe(false)

    // Pergunta sem resposta nenhuma também reprova — não há o que avaliar, e
    // deixar passar mandaria formulário vazio para a fila do instrutor.
    expect(valida([{ perguntaId: 'p1', texto: 'ok' }], regras)).toHaveLength(1)

    // Todas respondidas: passa no pré-filtro.
    const completo = valida(
      [
        { perguntaId: 'p1', texto: 'Um atendimento.' },
        { perguntaId: 'p2', texto: 'Um recurso escasso.' },
      ],
      regras,
    )
    expect(completo).toHaveLength(0)
    expect(aprovadoNoPreFiltro(completo)).toBe(true)

    // O motor devolve TODAS as reprovações, não a primeira: o aluno não pode
    // descobrir um erro por vez com o relógio andando.
    expect(valida([], regras)).toHaveLength(2)
  })

  it('o_motor_nao_tenta_os_julgamentos_humanos', () => {
    // Doc 2 §4.6 declara quatro verificações NÃO automatizáveis. Nenhuma delas
    // pode aparecer como tipo de regra, senão a plataforma passa a opinar sobre
    // o que exige leitura humana.
    const fonte = semComentarios(readFileSync('src/domain/validacao.ts', 'utf8'))

    expect(fonte).not.toMatch(/\b(evento|cadastro|formula|finito|contavel|imutabilidade)\b/i)
    // E nenhum limite numérico embutido: faixa e piso vêm da configuração.
    expect(fonte).not.toMatch(/minimo:\s*\d|maximo:\s*\d/)
  })

  it('rejeita_quantidade_de_estados_fora_da_faixa', () => {
    // FAIXA: a configuração desta pergunta neste curso é de 3 a 5 (Doc 2 §4.6).
    // Os números moram no dado, não no motor.
    const MINIMO = 3
    const MAXIMO = 5
    const regras = [
      regra({
        perguntaId: 'estados',
        tipo: 'contagem_de_itens',
        minimo: MINIMO,
        maximo: MAXIMO,
        mensagem: `Declare de ${MINIMO} a ${MAXIMO} estados, um por linha.`,
      }),
    ]

    const comNItens = (n: number) => [
      { perguntaId: 'estados', texto: Array.from({ length: n }, (_, i) => `Estado ${i + 1}`).join('\n') },
    ]

    // Abaixo do mínimo reprova.
    expect(valida(comNItens(MINIMO - 1), regras)).toHaveLength(1)
    // As duas pontas da faixa passam — limite é inclusivo.
    expect(valida(comNItens(MINIMO), regras)).toHaveLength(0)
    expect(valida(comNItens(MAXIMO), regras)).toHaveLength(0)
    // Acima do máximo reprova.
    expect(valida(comNItens(MAXIMO + 1), regras)).toHaveLength(1)

    // Linha vazia não conta: espaçamento não altera contagem.
    expect(
      valida([{ perguntaId: 'estados', texto: 'Um\n\n\nDois\n   \nTrês\n' }], regras),
    ).toHaveLength(0)

    // A mensagem que o aluno lê é a configurada.
    expect(valida(comNItens(1), regras)[0]?.mensagem).toContain('um por linha')
  })

  it('rejeita_quantidade_de_categorias_invalida', () => {
    // EXATO: mesmo mecanismo, mínimo igual ao máximo. O Doc 2 §4.6 pede
    // exatamente três nesta pergunta, e isso é configuração — não um segundo
    // tipo de regra.
    const EXATO = 3
    const regras = [
      regra({
        perguntaId: 'categorias',
        tipo: 'contagem_de_itens',
        minimo: EXATO,
        maximo: EXATO,
        mensagem: `Declare exatamente ${EXATO} categorias.`,
      }),
    ]

    const comNItens = (n: number) => [
      { perguntaId: 'categorias', texto: Array.from({ length: n }, (_, i) => `Categoria ${i + 1}`).join('\n') },
    ]

    expect(valida(comNItens(EXATO - 1), regras)).toHaveLength(1)
    expect(valida(comNItens(EXATO), regras)).toHaveLength(0)
    expect(valida(comNItens(EXATO + 1), regras)).toHaveLength(1)
  })

  it('rejeita_transicao_com_estado_nao_declarado', () => {
    // O vocabulário aceito é o que a OUTRA pergunta declarou. A regra não
    // conhece "estados": ela compara contra a resposta de referência (Doc 2 §4.6).
    const regras = [
      regra({
        perguntaId: 'transicoes',
        tipo: 'referencia_declarada',
        perguntaDeReferenciaId: 'estados',
        mensagem: 'Toda transição precisa citar estados que você declarou.',
      }),
    ]

    const estados = { perguntaId: 'estados', texto: ['Agendado', 'Em atendimento', 'Concluído'].join(NL) }

    // Todos os lados declarados: passa.
    expect(
      valida(
        [
          estados,
          {
            perguntaId: 'transicoes',
            texto: ['Concluído -> Agendado', 'Em atendimento → Agendado'].join(NL),
          },
        ],
        regras,
      ),
    ).toHaveLength(0)

    // "Cancelado" não foi declarado: reprova.
    expect(
      valida(
        [estados, { perguntaId: 'transicoes', texto: 'Cancelado -> Concluído' }],
        regras,
      ),
    ).toHaveLength(1)

    // O lado de destino também é verificado, não só a origem.
    expect(
      valida([estados, { perguntaId: 'transicoes', texto: 'Agendado -> Arquivado' }], regras),
    ).toHaveLength(1)

    // Caixa e acento não reprovam: a plataforma verifica modelagem, não
    // digitação. Recusar por acento gastaria o tempo que o pré-filtro poupa.
    expect(
      valida(
        [estados, { perguntaId: 'transicoes', texto: 'CONCLUIDO => em Atendimento' }],
        regras,
      ),
    ).toHaveLength(0)

    // Sem estados declarados, qualquer par reprova.
    expect(
      valida(
        [
          { perguntaId: 'estados', texto: 'x' },
          { perguntaId: 'transicoes', texto: 'Agendado -> Concluído' },
        ],
        regras,
      ),
    ).toHaveLength(1)
  })

  it('rejeita_fora_de_escopo_insuficiente', () => {
    // PISO: mesmo mecanismo, máximo nulo. Listar mais do que fica de fora é
    // sempre bem-vindo — o campo existe para conter o crescimento da aula
    // (Doc 3 §2), então não há teto.
    const PISO = 3
    const regras = [
      regra({
        perguntaId: 'fora-de-escopo',
        tipo: 'contagem_de_itens',
        minimo: PISO,
        maximo: null,
        mensagem: `Liste ao menos ${PISO} itens fora de escopo.`,
      }),
    ]

    const comNItens = (n: number) => [
      { perguntaId: 'fora-de-escopo', texto: Array.from({ length: n }, (_, i) => `Fora ${i + 1}`).join('\n') },
    ]

    expect(valida(comNItens(PISO - 1), regras)).toHaveLength(1)
    expect(valida(comNItens(PISO), regras)).toHaveLength(0)
    // Sem teto: vinte itens continuam válidos.
    expect(valida(comNItens(20), regras)).toHaveLength(0)
  })
})
