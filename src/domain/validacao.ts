/**
 * Motor de validação automática do formulário de escopo (Doc 2 §4.6).
 *
 * É um INTERPRETADOR de regras que moram como dado, não um schema. A ADR 0001
 * §5 é explícita sobre isso: as validações são declaradas na pergunta, e
 * escrever a faixa em código seria o literal com significado pedagógico que a
 * regra 4.3 do CLAUDE.md proíbe.
 *
 * Puro por construção — não importa framework nem banco (ADR 0001 §7). O motor
 * recebe as respostas e as regras já carregadas, e devolve as reprovações.
 *
 * Funciona como PRÉ-FILTRO: o formulário só chega ao instrutor depois de
 * passar. Isso preserva o tempo humano para os quatro julgamentos que o
 * Doc 2 §4.6 declara não automatizáveis — se a resposta descreve um evento, se
 * as fórmulas diferem em estrutura, se o recurso é finito, se a imutabilidade
 * é de negócio. Nenhum deles é tentado aqui.
 */

export type Regra = {
  perguntaId: string
  tipo: 'nao_vazio' | 'contagem_de_itens' | 'referencia_declarada' | 'lista_negra'
  minimo: number | null
  maximo: number | null
  perguntaDeReferenciaId: string | null
  termos: readonly string[] | null
  mensagem: string
}

export type RespostaParaValidar = {
  perguntaId: string
  texto: string
}

export type Reprovacao = {
  perguntaId: string
  tipo: Regra['tipo']
  mensagem: string
}

/**
 * Itens de uma resposta: uma linha, um item.
 *
 * É convenção de formato, não quantidade pedagógica — o aluno lista estados,
 * categorias ou exclusões uma por linha. Linha vazia não conta, para que
 * espaçamento não altere contagem.
 */
export function itensDaResposta(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0)
}

function aplicaNaoVazio(resposta: RespostaParaValidar | undefined): boolean {
  return resposta !== undefined && resposta.texto.trim().length > 0
}

/**
 * Executa as regras contra as respostas.
 *
 * Devolve TODAS as reprovações, não a primeira. O aluno tem 65 minutos para
 * preencher e não pode descobrir um erro por vez.
 */
export function valida(
  respostas: readonly RespostaParaValidar[],
  regras: readonly Regra[],
): Reprovacao[] {
  const porPergunta = new Map(respostas.map((r) => [r.perguntaId, r]))
  const reprovacoes: Reprovacao[] = []

  for (const regra of regras) {
    const resposta = porPergunta.get(regra.perguntaId)

    // Resposta ausente ou em branco reprova qualquer regra: não há o que
    // avaliar, e deixar passar mandaria formulário vazio para a fila.
    if (!aplicaNaoVazio(resposta)) {
      reprovacoes.push({
        perguntaId: regra.perguntaId,
        tipo: regra.tipo,
        mensagem: regra.mensagem,
      })
      continue
    }

    const texto = resposta!.texto

    if (regra.tipo === 'contagem_de_itens' && !dentroDaFaixa(texto, regra)) {
      reprovacoes.push({
        perguntaId: regra.perguntaId,
        tipo: regra.tipo,
        mensagem: regra.mensagem,
      })
      continue
    }

    if (regra.tipo === 'referencia_declarada') {
      const declarados = regra.perguntaDeReferenciaId
        ? itensDaResposta(porPergunta.get(regra.perguntaDeReferenciaId)?.texto ?? '')
        : []

      if (citaTermoNaoDeclarado(texto, declarados)) {
        reprovacoes.push({
          perguntaId: regra.perguntaId,
          tipo: regra.tipo,
          mensagem: regra.mensagem,
        })
      }
      continue
    }

    if (regra.tipo === 'lista_negra' && contemTermoProibido(texto, regra.termos ?? [])) {
      reprovacoes.push({
        perguntaId: regra.perguntaId,
        tipo: regra.tipo,
        mensagem: regra.mensagem,
      })
    }
  }

  return reprovacoes
}

/**
 * Quebra o texto em palavras, separando também CamelCase.
 *
 * A tabela de tradução tem uma coluna de nome no código, onde CamelCase é o
 * normal — e sem separar por maiúscula, `GerenciadorDeCortes` passaria batido
 * pela lista negra. Seria justamente o nome genérico que a regra existe para
 * caçar (Doc 2 §4.6).
 */
function palavrasDe(texto: string): string[] {
  return texto
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .map(normaliza)
    .filter((palavra) => palavra.length > 0)
}

/**
 * Procura termo da lista negra na resposta.
 *
 * A lista é CONFIGURÁVEL por curso: quais nomes contam como genéricos depende
 * do domínio, e uma lista em código envelheceria na primeira turma nova
 * (Doc 2 §4.6).
 *
 * A comparação é por palavra inteira, com acento e caixa normalizados. Sem a
 * fronteira de palavra, "Dados" reprovaria "Dadosaurio" — e pior, um termo
 * curto como "tipo" reprovaria "protótipo", ensinando o aluno a driblar o
 * validador em vez de nomear melhor.
 */
function contemTermoProibido(texto: string, termos: readonly string[]): boolean {
  const alvo = normaliza(texto)
  const palavras = new Set(palavrasDe(texto))

  return termos.some((termo) => {
    const proibido = normaliza(termo)
    if (proibido.length === 0) return false
    // Termo com espaço é expressão: procura como sequência, não como palavra.
    return proibido.includes(' ') ? alvo.includes(proibido) : palavras.has(proibido)
  })
}

/** Separadores aceitos entre os dois lados de um par. Formato, não regra. */
const SETAS = /\s*(?:->|-->|→|>|=>)\s*/

/**
 * Compara ignorando caixa, acento e espaço nas pontas.
 *
 * "Em Atendimento" e "em atendimento" são o mesmo estado para quem lê. Recusar
 * por acento seria a plataforma corrigindo digitação em vez de verificar
 * modelagem — e no D3 isso gasta o tempo que o pré-filtro existe para poupar.
 */
function normaliza(termo: string): string {
  return termo
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/**
 * Verifica se algum par cita termo que não foi declarado na outra pergunta.
 *
 * Cada item desta resposta é lido como um par ligado por seta — `origem → destino`.
 * Os dois lados precisam existir entre os itens declarados na pergunta de
 * referência. É assim que uma transição ilegal citando estado inexistente é
 * pega automaticamente (Doc 2 §4.6).
 *
 * Item sem seta é ignorado por esta regra: quantidade e preenchimento são
 * trabalho de `contagem_de_itens` e `nao_vazio`, e cada regra faz uma coisa.
 */
function citaTermoNaoDeclarado(texto: string, declarados: readonly string[]): boolean {
  const vocabulario = new Set(declarados.map(normaliza))

  return itensDaResposta(texto).some((item) => {
    const lados = item.split(SETAS).filter((lado) => lado.trim().length > 0)
    if (lados.length < 2) return false
    return lados.some((lado) => !vocabulario.has(normaliza(lado)))
  })
}

/**
 * Conta os itens e compara com a faixa declarada na pergunta.
 *
 * O mesmo mecanismo cobre três formas, e é isso que torna o motor
 * configurável em vez de codificado:
 *
 * - **faixa**   `minimo` e `maximo` preenchidos
 * - **exato**   `minimo` igual a `maximo`
 * - **piso**    só `minimo`, `maximo` nulo
 *
 * Nulo em cada ponta significa "sem limite deste lado". Nenhum número aparece
 * aqui: eles vêm da configuração da pergunta.
 */
function dentroDaFaixa(texto: string, regra: Regra): boolean {
  const quantidade = itensDaResposta(texto).length

  if (regra.minimo !== null && quantidade < regra.minimo) return false
  if (regra.maximo !== null && quantidade > regra.maximo) return false
  return true
}

/** Passou no pré-filtro? É o que decide se o formulário chega ao instrutor. */
export function aprovadoNoPreFiltro(reprovacoes: { readonly length: number }): boolean {
  return reprovacoes.length === 0
}
