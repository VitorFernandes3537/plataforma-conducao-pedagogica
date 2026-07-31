/**
 * Analisador de markdown, mínimo e próprio.
 *
 * Existe porque o conteúdo do material entra como markdown — o schema de
 * `materiaisInterativos` e de `blocosDeMaterial` diz isso — e nenhuma tela
 * renderizava nenhum dos dois até agora. Não havia dependência de markdown no
 * projeto, e a alternativa era trazer uma.
 *
 * Escrever é a escolha, por dois motivos concretos. O primeiro é tipografia: o
 * sistema visual tem quatro registros com trabalhos declarados (ADR 0003 §4), e
 * biblioteca de markdown emite `<h1>`, `<p>`, `<code>` para o CSS de terceiro
 * decidir — a serifada iria parar em rótulo e a monoespaçada em prosa. O segundo
 * é fronteira: o vocabulário aqui é fechado no que o Doc 11 usa de fato, e não
 * no que CommonMark admite.
 *
 * **Não é um renderizador de HTML.** Devolve uma árvore de nós, e quem desenha é
 * o componente. É por isso que isto é puro e testável sem montar React — e é por
 * isso que não há `dangerouslySetInnerHTML` em lugar nenhum: o texto do material
 * é escrito pelo instrutor, mas passa pelo banco, e conteúdo que vira HTML cru é
 * a porta que sempre esteve aberta em toda plataforma de aula.
 */

export type TrechoEmLinha =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'forte'; texto: string }
  | { tipo: 'codigo'; texto: string }

export type No =
  | { tipo: 'titulo'; nivel: 1 | 2 | 3; conteudo: TrechoEmLinha[] }
  | { tipo: 'paragrafo'; conteudo: TrechoEmLinha[] }
  | { tipo: 'lista'; ordenada: boolean; itens: TrechoEmLinha[][] }
  | { tipo: 'citacao'; paragrafos: TrechoEmLinha[][] }
  | { tipo: 'codigo'; lingua: string | null; linhas: string[] }
  | { tipo: 'tabela'; cabecalho: TrechoEmLinha[][]; linhas: TrechoEmLinha[][][] }

/**
 * Quebra uma linha em trechos de ênfase.
 *
 * Só três formas, e nenhuma delas aninha: negrito, código em linha e texto. O
 * Doc 11 não usa mais que isso, e aceitar aninhamento pediria um analisador de
 * verdade para ganhar nada.
 *
 * A ordem do alternador importa: `` ` `` vem antes de `**` para que um trecho de
 * código que contenha asteriscos — `a ** b`, que aparece em fórmula — não seja
 * lido como negrito.
 */
export function trechosDaLinha(linha: string): TrechoEmLinha[] {
  const trechos: TrechoEmLinha[] = []
  const padrao = /`([^`]+)`|\*\*([^*]+)\*\*/g
  let ultimo = 0

  for (const achado of linha.matchAll(padrao)) {
    const inicio = achado.index
    if (inicio > ultimo) {
      trechos.push({ tipo: 'texto', texto: linha.slice(ultimo, inicio) })
    }
    if (achado[1] !== undefined) {
      trechos.push({ tipo: 'codigo', texto: achado[1] })
    } else if (achado[2] !== undefined) {
      trechos.push({ tipo: 'forte', texto: achado[2] })
    }
    ultimo = inicio + achado[0].length
  }

  if (ultimo < linha.length) {
    trechos.push({ tipo: 'texto', texto: linha.slice(ultimo) })
  }

  return trechos
}

/** Divide uma linha de tabela em células, ignorando as barras das pontas. */
function celulas(linha: string): string[] {
  return linha
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim())
}

/** A linha de separação de tabela: `|---|:--:|`. Não é conteúdo. */
function ehSeparadorDeTabela(linha: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(linha) && linha.includes('-')
}

function ehLinhaDeTabela(linha: string): boolean {
  return linha.trim().startsWith('|')
}

/**
 * Analisa markdown em uma árvore de nós.
 *
 * Linha vazia separa blocos. Bloco de código é literal do começo ao fim — dentro
 * dele nada é interpretado, nem `#` nem `|`, porque código com `#` é comentário e
 * não título.
 */
export function analisa(fonte: string): No[] {
  const linhas = fonte.replace(/\r\n/g, '\n').split('\n')
  const nos: No[] = []
  let i = 0

  while (i < linhas.length) {
    const linha = linhas[i]!
    const cru = linha.trim()

    if (cru.length === 0) {
      i += 1
      continue
    }

    // Código: literal até a cerca de fechamento, ou até o fim se ela faltar.
    const cerca = cru.match(/^```(\w*)/)
    if (cerca) {
      const corpo: string[] = []
      i += 1
      while (i < linhas.length && !linhas[i]!.trim().startsWith('```')) {
        corpo.push(linhas[i]!)
        i += 1
      }
      i += 1
      nos.push({ tipo: 'codigo', lingua: cerca[1] || null, linhas: corpo })
      continue
    }

    const titulo = cru.match(/^(#{1,3})\s+(.*)$/)
    if (titulo) {
      nos.push({
        tipo: 'titulo',
        nivel: titulo[1]!.length as 1 | 2 | 3,
        conteudo: trechosDaLinha(titulo[2]!),
      })
      i += 1
      continue
    }

    if (ehLinhaDeTabela(cru)) {
      const brutas: string[] = []
      while (i < linhas.length && ehLinhaDeTabela(linhas[i]!)) {
        brutas.push(linhas[i]!)
        i += 1
      }
      const [primeira, ...resto] = brutas
      const corpo = resto.filter((l) => !ehSeparadorDeTabela(l))
      nos.push({
        tipo: 'tabela',
        cabecalho: celulas(primeira!).map(trechosDaLinha),
        linhas: corpo.map((l) => celulas(l).map(trechosDaLinha)),
      })
      continue
    }

    if (cru.startsWith('>')) {
      const dentro: string[] = []
      while (i < linhas.length && linhas[i]!.trim().startsWith('>')) {
        dentro.push(linhas[i]!.trim().replace(/^>\s?/, ''))
        i += 1
      }
      // Linha vazia dentro da citação separa parágrafos dela.
      const paragrafos: TrechoEmLinha[][] = []
      let atual: string[] = []
      for (const l of dentro) {
        if (l.trim().length === 0) {
          if (atual.length > 0) paragrafos.push(trechosDaLinha(atual.join(' ')))
          atual = []
        } else {
          atual.push(l)
        }
      }
      if (atual.length > 0) paragrafos.push(trechosDaLinha(atual.join(' ')))
      nos.push({ tipo: 'citacao', paragrafos })
      continue
    }

    const marcaDeLista = cru.match(/^([-*]|\d+\.)\s+/)
    if (marcaDeLista) {
      const ordenada = /\d/.test(marcaDeLista[1]!)
      const itens: TrechoEmLinha[][] = []
      while (i < linhas.length) {
        const atual = linhas[i]!.trim()
        const marca = atual.match(/^([-*]|\d+\.)\s+(.*)$/)
        if (!marca) break
        if (/\d/.test(marca[1]!) !== ordenada) break
        itens.push(trechosDaLinha(marca[2]!))
        i += 1
      }
      nos.push({ tipo: 'lista', ordenada, itens })
      continue
    }

    // Parágrafo: junta linhas até a próxima em branco ou o próximo bloco.
    const corpo: string[] = []
    while (i < linhas.length) {
      const atual = linhas[i]!.trim()
      if (atual.length === 0) break
      if (/^(#{1,3})\s/.test(atual)) break
      if (atual.startsWith('>')) break
      if (atual.startsWith('```')) break
      if (ehLinhaDeTabela(atual)) break
      if (/^([-*]|\d+\.)\s+/.test(atual)) break
      corpo.push(atual)
      i += 1
    }
    nos.push({ tipo: 'paragrafo', conteudo: trechosDaLinha(corpo.join(' ')) })
  }

  return nos
}

/**
 * Divide a árvore em seções, por título de nível 2.
 *
 * É o que os tipos de bloco com layout de coluna precisam — `forcas-limites` põe
 * dois lados lado a lado, `conceitos-2x2` põe quatro numa grade —, e cada lado é
 * um `##` no markdown. O conteúdo antes do primeiro `##` fica na abertura, sem
 * virar seção fantasma.
 */
export function secoes(nos: readonly No[]): {
  abertura: No[]
  secoes: { titulo: TrechoEmLinha[]; corpo: No[] }[]
} {
  const abertura: No[] = []
  const encontradas: { titulo: TrechoEmLinha[]; corpo: No[] }[] = []

  for (const no of nos) {
    if (no.tipo === 'titulo' && no.nivel === 2) {
      encontradas.push({ titulo: no.conteudo, corpo: [] })
      continue
    }
    if (encontradas.length === 0) abertura.push(no)
    else encontradas[encontradas.length - 1]!.corpo.push(no)
  }

  return { abertura, secoes: encontradas }
}

/** O texto puro de uma sequência de trechos. Para `title`, `aria` e chave. */
export function textoDe(conteudo: readonly TrechoEmLinha[]): string {
  return conteudo.map((t) => t.texto).join('')
}
