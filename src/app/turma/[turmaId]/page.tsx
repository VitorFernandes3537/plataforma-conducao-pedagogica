import { notFound } from 'next/navigation'

import { Cabecalho, Cartao, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { indicePublicoDaTurma } from '@/db/indice'

/**
 * O índice público de uma turma (Doc 5 §6.2).
 *
 * Única página da plataforma que não pergunta quem está lendo. Fica fora do
 * prefixo do instrutor, então o proxy a deixa passar sem sessão — e é assim que
 * o requisito "sem autenticação" é cumprido: por não estar protegida, não por
 * uma exceção escrita em algum lugar que alguém pode esquecer de manter.
 *
 * Mostra tema e repositório, e nada mais. O repositório é o produto público do
 * curso, compartilhado no último dia e no ar depois dele.
 */
export default async function IndicePublico({
  params,
}: {
  params: Promise<{ turmaId: string }>
}) {
  const { turmaId } = await params
  const grupos = await indicePublicoDaTurma(db(), turmaId)

  if (grupos.length === 0) notFound()

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 py-16">
      <Cabecalho legenda="Índice da turma" titulo="O que esta turma construiu">
        <p className="max-w-[52ch] text-tinta-media">
          Cada projeto é público e continua no ar depois do curso.
        </p>
      </Cabecalho>

      <ul className="flex flex-col gap-3">
        {grupos.map((grupo) => (
          <li key={grupo.grupoId}>
            <Cartao legenda={grupo.tema}>
              {grupo.repositorios.length === 0 ? (
                <p className="legenda">Repositório ainda não publicado.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {grupo.repositorios.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        className="underline underline-offset-4"
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Etiqueta>{rotuloDoRepositorio(url)}</Etiqueta>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </li>
        ))}
      </ul>
    </main>
  )
}

/**
 * O rótulo curto de um repositório.
 *
 * Mostra o caminho, não a URL inteira: a linha fica legível e o que identifica o
 * projeto é o fim dela. Se a URL não tiver a forma esperada, mostra a URL — é
 * melhor um rótulo feio que um link sem texto.
 */
function rotuloDoRepositorio(url: string): string {
  try {
    const caminho = new URL(url).pathname.replace(/^\//, '')
    return caminho.length > 0 ? caminho : url
  } catch {
    return url
  }
}
