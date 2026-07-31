import { Etiqueta } from '@/components/ui'
import { analisa, secoes, textoDe, type No } from '@/lib/markdown'

import { MatrizComparativa } from './matriz-comparativa'
import { Linha, Prosa } from './prosa'

export type TipoDeBloco =
  | 'tese'
  | 'mecanismo'
  | 'conceitos-2x2'
  | 'ancoragem'
  | 'codigo-anotado'
  | 'forcas-limites'
  | 'matriz-comparativa'
  | 'predicao'
  | 'classificador'

/**
 * Desenho de um bloco de material.
 *
 * O layout de cada tipo vem do Doc 11 §10, que é SSOT declarada: ela diz a
 * FUNÇÃO de cada tipo, e a função decide a forma. `conceitos-2x2` é grade porque
 * a seção diz "em grid"; `forcas-limites` é duas colunas porque diz "lado a
 * lado"; `codigo-anotado` põe as chamadas na margem porque diz "com chamadas
 * laterais".
 *
 * **A plataforma renderiza, não define** (Doc 11 §10). Nenhum tipo aqui inventa
 * conteúdo, e nenhum sabe qual resposta é a certa — o gabarito é texto que o
 * instrutor escreveu, e a plataforma apenas o segura até a hora.
 *
 * A estrutura do markdown é o que cada tipo lê: `##` abre coluna, lista vira
 * item, tabela vira matriz. Nenhuma convenção nova foi inventada — são as
 * mesmas formas que o Doc 11 já usa ao descrever o material.
 */
export function Bloco({
  tipo,
  conteudo,
  conteudoRevelado,
}: {
  tipo: TipoDeBloco
  conteudo: string
  /** Só chega aqui quando a consulta decide que pode. A tela não o segura. */
  conteudoRevelado?: string | null
}) {
  const nos = analisa(conteudo)

  switch (tipo) {
    case 'tese':
      return <Tese nos={nos} />
    case 'conceitos-2x2':
    case 'forcas-limites':
      return <EmColunas nos={nos} />
    case 'ancoragem':
      return <Ancoragem nos={nos} />
    case 'codigo-anotado':
      return <CodigoAnotado nos={nos} />
    case 'matriz-comparativa':
      return <Matriz nos={nos} />
    case 'predicao':
      return <Predicao nos={nos} revelado={conteudoRevelado ?? null} />
    case 'classificador':
      return <Classificador nos={nos} revelado={conteudoRevelado ?? null} />
    case 'mecanismo':
      return <Prosa nos={nos} />
  }
}

/**
 * Tese: a afirmação central, em uma frase.
 *
 * O título é o herói e o resto defere. É o único tipo em que o corpo encolhe em
 * vez de crescer — a lâmina existe para uma frase ser lida da porta da sala.
 */
function Tese({ nos }: { nos: readonly No[] }) {
  const [primeiro, ...resto] = nos
  const titulo = primeiro?.tipo === 'titulo' ? primeiro : null

  return (
    <div className="flex flex-col gap-6">
      {titulo && (
        <h2 className="max-w-[20ch] font-prosa text-[2.75rem] leading-[1.08] tracking-tight text-tinta">
          <Linha conteudo={titulo.conteudo} />
        </h2>
      )}
      {(titulo ? resto : nos).length > 0 && (
        <Prosa nos={titulo ? resto : nos} className="max-w-[52ch]" />
      )}
    </div>
  )
}

/**
 * Colunas, para `conceitos-2x2` e `forcas-limites`.
 *
 * As colunas são os `##` do markdown. Com um só, ou nenhum, o bloco cai em
 * coluna única em vez de abrir uma grade com buraco — material antigo não pode
 * quebrar por não conhecer uma convenção nova.
 */
function EmColunas({ nos }: { nos: readonly No[] }) {
  const divisao = secoes(nos)

  if (divisao.secoes.length < 2) return <Prosa nos={nos} />

  return (
    <div className="flex flex-col gap-6">
      {divisao.abertura.length > 0 && <Prosa nos={divisao.abertura} />}
      {/* Duas colunas escritas por extenso: o Tailwind v4 só emite a classe que
          encontra escrita no código, e `grid-cols-${n}` não chega ao CSS. */}
      <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {divisao.secoes.map((secao) => (
          <section key={textoDe(secao.titulo)}>
            <h3 className="text-lg font-semibold tracking-tight text-tinta">
              <Linha conteudo={secao.titulo} />
            </h3>
            <Prosa nos={secao.corpo} className="mt-3" />
          </section>
        ))}
      </div>
    </div>
  )
}

/**
 * Ancoragem: "você já usa sem saber".
 *
 * Ganha a sobrancelha que nomeia o movimento. Sem ela a lâmina lê como mais uma
 * lista, e o efeito do tipo é justamente o reconhecimento — o aluno precisa
 * saber que aquilo é repertório dele, não conteúdo novo.
 */
function Ancoragem({ nos }: { nos: readonly No[] }) {
  return (
    <div>
      <p className="legenda">você já usa isto</p>
      <Prosa nos={nos} className="mt-3" />
    </div>
  )
}

/**
 * Código anotado: o bloco de código, e as chamadas na margem.
 *
 * A lista que vier depois do código são as chamadas. Em tela larga elas vão para
 * a lateral, numeradas, ao lado do trecho; abaixo de `lg` empilham — margem que
 * não cabe deixa de ser margem e vira interrupção.
 */
function CodigoAnotado({ nos }: { nos: readonly No[] }) {
  const codigo = nos.filter((n) => n.tipo === 'codigo')
  const chamadas = nos.filter((n) => n.tipo === 'lista')
  const resto = nos.filter((n) => n.tipo !== 'codigo' && n.tipo !== 'lista')

  if (codigo.length === 0) return <Prosa nos={nos} />

  return (
    <div className="flex flex-col gap-5">
      {resto.length > 0 && <Prosa nos={resto} />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Prosa nos={codigo} />
        {chamadas.length > 0 && (
          <div>
            <p className="legenda">o que olhar</p>
            <Prosa nos={chamadas} className="mt-2" />
          </div>
        )}
      </div>
    </div>
  )
}

/** Matriz comparativa: a tabela, com a linha equivalente acesa nas quatro lentes. */
function Matriz({ nos }: { nos: readonly No[] }) {
  const tabela = nos.find((n) => n.tipo === 'tabela')
  const resto = nos.filter((n) => n.tipo !== 'tabela')

  return (
    <div className="flex flex-col gap-5">
      {resto.length > 0 && <Prosa nos={resto} />}
      {tabela ? (
        <MatrizComparativa tabela={tabela} />
      ) : (
        <p className="legenda">esta lâmina não tem matriz</p>
      )}
      <p className="legenda">passe por uma linha para compará-la nas quatro lentes</p>
    </div>
  )
}

/**
 * Predição: a pergunta, e a aposta antes de qualquer revelação.
 *
 * A lista de opções é a aposta. Elas aparecem como alvos e não como texto porque
 * o que a lâmina pede é uma escolha — e a escolha é registrada por aluno, antes
 * de o agregado existir (Doc 11 §11).
 *
 * Aqui elas são só o desenho. Quem registra e quem libera o agregado é a tela de
 * apresentação, com a sessão na mão.
 */
function Predicao({ nos, revelado }: { nos: readonly No[]; revelado: string | null }) {
  const opcoes = nos.find((n) => n.tipo === 'lista')
  const pergunta = nos.filter((n) => n !== opcoes)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="legenda">aposte antes de ver</p>
        <Prosa nos={pergunta} className="mt-3" />
      </div>

      {opcoes && (
        <ul className="flex flex-wrap gap-2">
          {opcoes.itens.map((item, indice) => (
            <li key={indice}>
              <span className="botao botao-fantasma cursor-default">
                <Linha conteudo={item} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {revelado ? (
        <div className="border-t border-linha pt-4">
          <p className="legenda">depois da aposta</p>
          <Prosa nos={analisa(revelado)} className="mt-2" />
        </div>
      ) : (
        <p className="legenda">o resultado aparece depois que você aposta</p>
      )}
    </div>
  )
}

/**
 * Classificador: os cartões, e as categorias.
 *
 * O gabarito é `conteudoRevelado`, e a plataforma **não sabe** qual resposta é a
 * certa — ela segura o texto até a submissão, sem lê-lo. É o que permite o mesmo
 * tipo servir a qualquer conteúdo de qualquer curso.
 */
function Classificador({ nos, revelado }: { nos: readonly No[]; revelado: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <p className="legenda">classifique cada um</p>
        <Etiqueta tracejada>em dupla</Etiqueta>
      </div>

      <Prosa nos={nos} />

      {revelado ? (
        <div className="border-t border-linha pt-4">
          <p className="legenda">o gabarito</p>
          <Prosa nos={analisa(revelado)} className="mt-2" />
        </div>
      ) : (
        <p className="legenda">o gabarito aparece depois que a dupla envia</p>
      )}
    </div>
  )
}
