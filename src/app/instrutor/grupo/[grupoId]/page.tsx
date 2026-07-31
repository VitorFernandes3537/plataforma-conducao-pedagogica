import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { RegistroDeDefesa } from '@/components/instrutor/registro-de-defesa'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { perguntasDoFormularioEmOrdem } from '@/db/formulario'
import { dadosDoGrupo } from '@/db/grupo'
import { incrementoDoGrupo } from '@/db/incremento'
import { historicoDePodas } from '@/db/poda'
import { respostaDoGrupo } from '@/db/resposta-de-escopo'
import { bancoDePerguntas, perguntasDaDefesaDoGrupo } from '@/db/rubrica'
import type { EstadoDoEscopo } from '@/domain/escopo'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Grupo — PCP' }

/**
 * A ficha do grupo — a visão que o instrutor abre para ver um grupo inteiro
 * (ADR 0006 §5): escopo, poda, incremento e defesa, numa tela.
 *
 * É de leitura, com uma exceção: a defesa oral do D15 se registra aqui, porque é
 * aqui que o instrutor tem o grupo à frente. A poda e a derivação do incremento
 * são atos de escrita que pedem formulário próprio, e ficam para as suas telas —
 * esta mostra o resultado deles.
 *
 * O filtro de visibilidade é de consulta (CLAUDE §5.3): o incremento é buscado
 * como instrutor, que vê antes da liberação porque é quem o escreve.
 */
export default async function FichaDoGrupo({
  params,
}: {
  params: Promise<{ grupoId: string }>
}) {
  const { grupoId } = await params

  const sessao = await auth()
  if (!sessao?.usuarioId) redirect(`/entrar?callbackUrl=/instrutor/grupo/${grupoId}`)

  const banco = db()
  const dados = await dadosDoGrupo(banco, grupoId)
  if (!dados) notFound()

  const ator = { papel: 'instrutor' as const, usuarioId: sessao.usuarioId }
  const escopo = await respostaDoGrupo(banco, grupoId)

  const [perguntas, podas, incremento, bancoDaDefesa, defesaFeita] = await Promise.all([
    escopo ? perguntasDoFormularioEmOrdem(banco, escopo.formularioId) : Promise.resolve([]),
    escopo ? historicoDePodas(banco, escopo.id) : Promise.resolve([]),
    // A ordem do dia não importa para o instrutor — ele vê antes da liberação.
    incrementoDoGrupo(banco, grupoId, ator, Number.MAX_SAFE_INTEGER),
    bancoDePerguntas(banco, dados.cursoId),
    perguntasDaDefesaDoGrupo(banco, grupoId),
  ])

  const enunciadoDe = new Map(perguntas.map((p) => [p.id, p.enunciado]))
  const estado: EstadoDoEscopo | null = escopo?.estado ?? null

  return (
    <Casca>
      <Cabecalho legenda="Ficha do grupo" titulo={dados.tema ?? 'Grupo sem tema alocado'}>
        {dados.integrantes.length > 0 ? (
          <p className="text-tinta-media">
            {dados.integrantes.map((i) => i.nome).join(' · ')}
            {dados.integrantes.length === 1 && (
              <span className="legenda ml-2">sozinho</span>
            )}
          </p>
        ) : (
          <p className="text-tinta-fraca">Grupo sem integrante matriculado.</p>
        )}
      </Cabecalho>

      {/* ── Repositórios ─────────────────────────────────────────────── */}
      {dados.integrantes.some((i) => i.repositorio) && (
        <Cartao legenda="Repositórios">
          <ul className="flex flex-col gap-2">
            {dados.integrantes.map((integrante) => (
              <li key={integrante.alunoId} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="w-[14ch] shrink-0 text-[0.9375rem] text-tinta">
                  {integrante.nome}
                </span>
                {integrante.repositorio ? (
                  <a
                    href={integrante.repositorio}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.875rem] text-tinta underline underline-offset-4"
                  >
                    {integrante.repositorio}
                  </a>
                ) : (
                  <span className="legenda">sem repositório publicado</span>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {/* ── Escopo ───────────────────────────────────────────────────── */}
      <Cartao
        legenda="Escopo"
        acao={estado ? <Etiqueta tom={TOM_DO_ESCOPO[estado]}>{estado}</Etiqueta> : undefined}
      >
        {!escopo ? (
          <p className="max-w-[62ch] text-tinta-media">
            O grupo ainda não abriu o formulário de escopo.
          </p>
        ) : estado !== 'aprovado' ? (
          <p className="max-w-[62ch] text-tinta-media">
            O escopo está <span className="text-tinta">{estado}</span>.{' '}
            {estado === 'submetido' ? (
              <>
                Ele espera decisão na{' '}
                <Link href="/instrutor/fila" className="text-tinta underline underline-offset-4">
                  fila de aprovação
                </Link>
                .
              </>
            ) : (
              'Ele vira gabarito de correção quando for aprovado.'
            )}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {perguntas.map((pergunta) => {
              const resposta = escopo.respostas.find((r) => r.perguntaId === pergunta.id)
              return (
                <div key={pergunta.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="dado text-[0.6875rem] text-tinta-fraca">{pergunta.ordem}</span>
                    <h3 className="legenda">{pergunta.enunciado}</h3>
                  </div>
                  <p className="mt-1 max-w-[62ch] whitespace-pre-line font-prosa leading-relaxed text-tinta">
                    {resposta?.texto || '—'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Cartao>

      {/* ── Poda ─────────────────────────────────────────────────────── */}
      {podas.length > 0 && (
        <Cartao legenda="Poda do escopo" contagem={podas.length}>
          <p className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta-media">
            O que o grupo deixou de entregar depois da aprovação. É o que o
            instrutor consulta na defesa.
          </p>
          <div className="mt-4 flex flex-col gap-5">
            {podas.map((poda) => (
              <div key={poda.podaId} className="border-t border-linha pt-4">
                <p className="legenda">motivo</p>
                <p className="mt-1 max-w-[62ch] text-[0.9375rem] leading-snug text-tinta">
                  {poda.motivo}
                </p>
                <p className="legenda mt-3">respostas antes da poda</p>
                <ul className="mt-1 flex flex-col gap-2">
                  {poda.respostas.map((r) => (
                    <li
                      key={r.perguntaId}
                      className="max-w-[62ch] whitespace-pre-line text-[0.875rem] leading-snug text-tinta-media"
                    >
                      <span className="legenda">{enunciadoDe.get(r.perguntaId) ?? 'pergunta'}</span>
                      <br />
                      {r.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {/* ── Incremento ───────────────────────────────────────────────── */}
      <Cartao
        legenda="Incremento"
        acao={
          incremento ? (
            <Etiqueta tom={incremento.versao === 'reduzida' ? 'destaque' : 'neutro'}>
              {incremento.versao}
            </Etiqueta>
          ) : undefined
        }
      >
        {!incremento ? (
          <AusenciaDeclarada legenda="Ainda não derivado">
            O envelope de incremento é derivado do escopo entre o D4 e o D11, para
            liberar no D12. Enquanto não for, não há o que mostrar.
          </AusenciaDeclarada>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="legenda">de</p>
              <p className="text-[0.9375rem] text-tinta">{incremento.remetente}</p>
              <p className="mt-2 max-w-[62ch] font-prosa leading-relaxed text-tinta-media">
                {incremento.contexto}
              </p>
            </div>

            {incremento.mudancas.map((mudanca) => (
              <div key={mudanca.rotulo} className="border-t border-linha pt-3">
                <p className="legenda">{mudanca.rotulo}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {mudanca.lacunas.map((lacuna) => (
                    <li key={lacuna.chave} className="text-[0.9375rem] leading-snug text-tinta">
                      <span className="text-tinta-fraca">{lacuna.rotulo}: </span>
                      {lacuna.valor}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {incremento.itensImutaveis.length > 0 && (
              <div className="border-t border-linha pt-3">
                <p className="legenda">o que não muda</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {incremento.itensImutaveis.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden="true" className="mt-[0.6rem] h-px w-3 shrink-0 bg-linha-forte" />
                      <span className="text-[0.9375rem] leading-snug text-tinta-media">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Cartao>

      {/* ── Defesa oral ──────────────────────────────────────────────── */}
      <Cartao legenda="Defesa oral">
        <RegistroDeDefesa
          grupoId={grupoId}
          banco={bancoDaDefesa.map((p) => ({ id: p.id, enunciado: p.enunciado }))}
          jaRegistradas={defesaFeita}
        />
      </Cartao>
    </Casca>
  )
}

const TOM_DO_ESCOPO: Record<EstadoDoEscopo, 'neutro' | 'destaque' | 'portao' | 'tinta'> = {
  rascunho: 'neutro',
  submetido: 'tinta',
  aprovado: 'destaque',
  devolvido: 'portao',
}
