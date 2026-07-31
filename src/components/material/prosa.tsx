import type { No, TrechoEmLinha } from '@/lib/markdown'

/**
 * Desenho do markdown do material, no sistema visual da casa.
 *
 * A decisão tipográfica que vale registrar: **título em serifada, corpo em
 * Archivo.** A ADR 0003 §4 dá a Literata a "título de tela e prosa de aluno",
 * com parcimônia, e o material é denso e estrutural — tabela, código, lista. A
 * serifada carrega o título e a citação; o corpo, que compete com código na
 * mesma lâmina, fica no corpo de interface.
 *
 * Código nunca herda a fonte do texto ao redor: numeral tabular e largura fixa
 * são requisito, não estilo, e trecho de código em fonte proporcional muda de
 * largura entre duas lâminas que deveriam alinhar.
 */

export function Linha({ conteudo }: { conteudo: readonly TrechoEmLinha[] }) {
  return (
    <>
      {conteudo.map((trecho, indice) => {
        if (trecho.tipo === 'forte') {
          return (
            <strong key={indice} className="font-semibold text-tinta">
              {trecho.texto}
            </strong>
          )
        }
        if (trecho.tipo === 'codigo') {
          return (
            <code
              key={indice}
              className="dado rounded-[4px] bg-recuo px-1 py-0.5 text-[0.875em] text-tinta"
            >
              {trecho.texto}
            </code>
          )
        }
        return <span key={indice}>{trecho.texto}</span>
      })}
    </>
  )
}

/** Uma sequência de nós. É o corpo de qualquer bloco. */
export function Prosa({ nos, className = '' }: { nos: readonly No[]; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {nos.map((no, indice) => (
        <NoDoMaterial key={indice} no={no} />
      ))}
    </div>
  )
}

function NoDoMaterial({ no }: { no: No }) {
  switch (no.tipo) {
    case 'titulo':
      if (no.nivel === 1) {
        return (
          <h2 className="max-w-[26ch] font-prosa text-[2rem] leading-[1.15] tracking-tight text-tinta">
            <Linha conteudo={no.conteudo} />
          </h2>
        )
      }
      if (no.nivel === 2) {
        return (
          <h3 className="max-w-[46ch] text-lg font-semibold tracking-tight text-tinta">
            <Linha conteudo={no.conteudo} />
          </h3>
        )
      }
      return (
        <h4 className="legenda">
          <Linha conteudo={no.conteudo} />
        </h4>
      )

    case 'paragrafo':
      return (
        <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-tinta-media">
          <Linha conteudo={no.conteudo} />
        </p>
      )

    case 'lista':
      // Ordenada mantém o número, porque em revelação por camadas a ordem É a
      // informação — "o requisito toca 1, 2, 3, 4". Não ordenada usa o filete da
      // casa em vez de bolinha: o sistema não tem pictograma.
      return no.ordenada ? (
        <ol className="flex max-w-[62ch] flex-col gap-2.5">
          {no.itens.map((item, indice) => (
            <li key={indice} className="flex items-start gap-3">
              <span className="dado mt-[0.2rem] shrink-0 text-[0.75rem] text-tinta-fraca">
                {indice + 1}
              </span>
              <span className="text-[1.0625rem] leading-snug text-tinta-media">
                <Linha conteudo={item} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="flex max-w-[62ch] flex-col gap-2.5">
          {no.itens.map((item, indice) => (
            <li key={indice} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-[0.72rem] h-px w-3 shrink-0 bg-linha-forte" />
              <span className="text-[1.0625rem] leading-snug text-tinta-media">
                <Linha conteudo={item} />
              </span>
            </li>
          ))}
        </ul>
      )

    case 'citacao':
      // Filete à esquerda em vez de caixa — margem de papel, não cartão dentro
      // de cartão. É o mesmo device da pergunta do obstáculo.
      return (
        <blockquote className="max-w-[52ch] border-l-2 border-tinta pl-5">
          {no.paragrafos.map((paragrafo, indice) => (
            <p
              key={indice}
              className="font-prosa text-[1.25rem] leading-snug text-tinta first:mt-0 [&+p]:mt-3"
            >
              <Linha conteudo={paragrafo} />
            </p>
          ))}
        </blockquote>
      )

    case 'codigo':
      return (
        <pre className="overflow-x-auto rounded-[var(--radius-controle)] border border-linha bg-recuo px-4 py-3">
          <code className="dado text-[0.8125rem] leading-relaxed text-tinta">
            {no.linhas.join('\n')}
          </code>
        </pre>
      )

    case 'tabela':
      return <Tabela no={no} />
  }
}

/**
 * Tabela.
 *
 * Rola dentro de si em vez de esticar a lâmina: a matriz do Doc 11 §7 tem cinco
 * colunas, e uma lâmina que rola horizontalmente inteira perde o título de vista
 * justo quando a sala está comparando.
 *
 * A primeira coluna é rótulo de linha e vai em `legenda` — nas matrizes do
 * material ela nomeia a dimensão comparada, não é dado.
 */
function Tabela({ no }: { no: Extract<No, { tipo: 'tabela' }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {no.cabecalho.map((celula, indice) => (
              <th
                key={indice}
                scope="col"
                className="legenda border-b border-linha-forte px-3 py-2 align-bottom"
              >
                <Linha conteudo={celula} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {no.linhas.map((linha, indiceDaLinha) => (
            <tr key={indiceDaLinha} className="border-b border-linha last:border-b-0">
              {linha.map((celula, indiceDaCelula) => (
                <td
                  key={indiceDaCelula}
                  className={`px-3 py-2.5 align-top text-[0.9375rem] leading-snug ${
                    indiceDaCelula === 0 ? 'legenda whitespace-nowrap' : 'text-tinta-media'
                  }`}
                >
                  <Linha conteudo={celula} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
