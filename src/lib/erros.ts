/**
 * O tratamento de erro da plataforma, num lugar só.
 *
 * **Nada que uma pessoa lê sobre uma falha é escrito fora daqui.** A regra é
 * essa, e ela existe por dois motivos que já custaram caro neste projeto.
 *
 * O primeiro é vazamento. Um erro de infraestrutura chegou à tela do instrutor
 * escrito `No transactions support in neon-http driver`, em inglês, abaixo da
 * lista de alunos, no meio de uma aula. Nada nele serve a quem está lendo, e o
 * que ele diz sobre a infraestrutura não é da conta de quem está na sala.
 *
 * O segundo é manutenção. Com as frases espalhadas por quinze `catch`, saber se
 * a plataforma fala bem exige abrir quinze arquivos. Aqui se lê um.
 *
 * ## A divisão
 *
 * Erros de **regra** — `EscopoInvalido`, `AlocacaoInvalida`, `TransicaoIlegal` —
 * já nascem com a frase certa, escrita ao lado da regra que a produziu: "Este
 * tema já foi alocado a outro grupo da turma. Escolha outro." Reescrevê-la aqui
 * duplicaria o texto e o tornaria genérico. O que este arquivo decide sobre eles
 * é que **a frase deles pode ser mostrada**, e com que tom.
 *
 * Todo o resto — driver, rede, banco, bug — é infraestrutura, e a frase é daqui.
 * A mensagem original nunca chega à tela; ela vai para o log do servidor.
 *
 * A lista abaixo não pode envelhecer em silêncio: `tests/erros.test.ts` varre as
 * classes de erro do projeto e falha se alguma não estiver classificada.
 */

export type AvisoDeErro = {
  mensagem: string
  /** `portao` é bloqueio: o que impede prosseguir. `destaque` é o resto. */
  tom: 'portao' | 'destaque'
}

/**
 * Erros cuja mensagem é escrita para uma pessoa, e o tom de cada um.
 *
 * Chaveado por `name` e não por `instanceof`: o mesmo arquivo é carregado em
 * mais de um contexto no App Router, e `instanceof` entre instâncias diferentes
 * do módulo devolve falso justamente no caminho de erro, que é onde ninguém
 * está olhando.
 */
const DE_REGRA: Record<string, AvisoDeErro['tom']> = {
  // Autorização: bloqueio por definição.
  AcessoNegado: 'portao',
  NaoAutorizado: 'portao',
  AtorDesconhecido: 'portao',
  TransicaoIlegal: 'portao',

  // Regra de conteúdo: a pessoa corrige e tenta de novo.
  AgregacaoInvalida: 'destaque',
  AlocacaoInvalida: 'destaque',
  AtribuicaoDeExtensaoInvalida: 'destaque',
  AtribuicaoInvalida: 'destaque',
  BlocoInvalido: 'destaque',
  ContratoInvalido: 'destaque',
  CriticaInvalida: 'destaque',
  DiaInvalido: 'destaque',
  EscopoInvalido: 'destaque',
  IncrementoInvalido: 'destaque',
  ItemDeMuralInvalido: 'destaque',
  PainelIndisponivel: 'destaque',
  PodaInvalida: 'destaque',
  RecuperacaoInvalida: 'destaque',
  ReflexaoInvalida: 'destaque',
  RegistroInvalido: 'destaque',
}

/** Só para o teste de cobertura. Não é usado em runtime. */
export const NOMES_DE_ERRO_DE_REGRA = Object.keys(DE_REGRA)

/**
 * O que a pessoa lê quando a plataforma falha por conta própria.
 *
 * Diz o que aconteceu, o que fazer, e **não pede desculpa**. Quem está em aula
 * precisa decidir se tenta de novo ou se segue sem a plataforma, e um pedido de
 * desculpa não ajuda em nenhuma das duas.
 */
const FALHA_INTERNA: AvisoDeErro = {
  mensagem:
    'Não foi possível concluir. A falha é da plataforma, não do que você escreveu — tente de novo, e se repetir, siga a aula e avise depois.',
  tom: 'destaque',
}

const SESSAO_EXPIRADA: AvisoDeErro = {
  mensagem: 'Sua sessão expirou. Entre de novo para continuar.',
  tom: 'portao',
}

/**
 * O `redirect()` e o `notFound()` do Next são lançados como erro para navegar.
 *
 * Engoli-los transformaria uma navegação em "não foi possível concluir", e o
 * sintoma seria uma tela que não vai a lugar nenhum sem dizer por quê.
 */
export function ehControleDeFluxoDoNext(erro: unknown): boolean {
  const digest = (erro as { digest?: unknown } | null)?.digest
  if (typeof digest !== 'string') return false
  return digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT')
}

/** A sessão sumiu no meio do caminho. Acontece, e não é falha da plataforma. */
function ehSessaoExpirada(erro: unknown): boolean {
  return erro instanceof Error && /sess(ã|a)o expirada/i.test(erro.message)
}

/**
 * Traduz qualquer coisa lançada para o que a pessoa lê.
 *
 * Aceita `unknown` porque é o que um `catch` entrega, e porque coisa que não é
 * `Error` é lançada de verdade — biblioteca antiga lança string, e `Promise`
 * rejeitada com objeto qualquer chega aqui igual.
 */
export function traduzErro(erro: unknown): AvisoDeErro {
  if (ehSessaoExpirada(erro)) return SESSAO_EXPIRADA

  if (erro instanceof Error) {
    const tom = DE_REGRA[erro.name]
    if (tom && erro.message.trim().length > 0) {
      return { mensagem: erro.message, tom }
    }
  }

  return FALHA_INTERNA
}

export type Resultado<T = void> = { ok: true; valor: T } | { ok: false; erro: AvisoDeErro }

/**
 * Executa o trabalho de uma server action e devolve o resultado, sem lançar.
 *
 * **Devolver em vez de lançar não é preferência de estilo.** Em produção o Next
 * substitui a mensagem de qualquer erro que atravessa a fronteira do servidor
 * por um `digest` — o cliente recebe um texto genérico e o `catch` da tela não
 * tem o que mostrar. A tradução tem de acontecer aqui, do lado do servidor, e
 * atravessar como dado.
 *
 * O erro original vai para o log do servidor inteiro, com pilha. É o único lugar
 * em que ele aparece, e é o lugar certo.
 */
export async function tenta<T>(trabalho: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, valor: await trabalho() }
  } catch (erro) {
    if (ehControleDeFluxoDoNext(erro)) throw erro

    console.error('[acao]', erro)
    return { ok: false, erro: traduzErro(erro) }
  }
}
