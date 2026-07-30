import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { aprovadoNoPreFiltro, valida, type Regra } from '@/domain/validacao'

// Nomes vindos literalmente dos critérios de aceite da issue 7 em
// docs/BACKLOG.md. SSOT: Doc 2 §4.6.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

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
})
