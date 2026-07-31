import { redirect } from 'next/navigation'

import { MarcaFaisca } from '@/components/marcas'
import { AusenciaDeclarada, Cabecalho, Cartao, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { diaCorrenteDaTurma } from '@/db/dia-corrente'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { incrementoDoGrupo } from '@/db/incremento'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Incremento — PCP' }

/**
 * O incremento que chega ao grupo (Doc 6 §4.1 · D12).
 *
 * É a tela do aluno RECEBENDO o envelope — um pedido de mudança que vem de fora,
 * assinado por um interessado nomeado do domínio. O grupo lê e passa a absorver;
 * não há ação aqui, porque escrever o incremento é do instrutor. Se o grupo
 * pudesse escrevê-lo, deixaria de ser mudança externa e o eixo de absorção
 * mediria a própria imaginação dele.
 *
 * A liberação é filtro de **consulta**, não de tela (CLAUDE §5.3): antes do dia
 * de liberação, `incrementoDoGrupo` devolve nulo para o aluno — o envelope não
 * chega ao navegador, nem escondido numa resposta que a interface ignora. É o
 * mesmo motivo pelo qual o material de referência filtra em SQL.
 */
export default async function Incremento() {
  const sessao = await auth()
  if (!sessao?.usuarioId) redirect('/entrar?callbackUrl=/incremento')

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)

  if (!matricula) {
    return (
      <Casca>
        <Cabecalho legenda="Incremento" titulo="Você ainda não está numa turma" />
        <AusenciaDeclarada legenda="Matrícula">
          O incremento chega ao grupo. Quando o instrutor te incluir numa turma,
          o envelope aparece aqui no dia em que ele liberar.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  if (!matricula.grupoId) {
    return (
      <Casca>
        <Cabecalho legenda="Incremento" titulo="O incremento é do grupo" />
        <AusenciaDeclarada legenda="Grupo">
          O envelope chega a um grupo, não a uma pessoa. Enquanto você não
          estiver num, não há o que receber.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const dia = await diaCorrenteDaTurma(banco, matricula.turmaId)
  const ator = { papel: 'aluno' as const, usuarioId: sessao.usuarioId, grupoId: matricula.grupoId }
  // Sem dia corrente, nada foi liberado — a ordem 0 não alcança dia nenhum.
  const incremento = await incrementoDoGrupo(banco, matricula.grupoId, ator, dia?.ordem ?? 0)

  if (!incremento) {
    return (
      <Casca>
        <Cabecalho legenda="Incremento" titulo="O envelope ainda não chegou" />
        <AusenciaDeclarada legenda="Liberação" anotacao="chega no D12">
          O incremento é um pedido de mudança que o instrutor libera no dia
          marcado. Até lá ele não existe para você — e é de propósito: a mudança
          precisa chegar sem aviso, como chega no trabalho real.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  return (
    <Casca>
      <Cabecalho legenda={`Incremento · liberado no dia ${incremento.ordemDeLiberacao}`} titulo="Chegou um pedido de mudança">
        <Etiqueta tom={incremento.versao === 'reduzida' ? 'destaque' : 'neutro'}>
          {incremento.versao}
        </Etiqueta>
      </Cabecalho>

      {/* O envelope é o herói da tela. Filete à esquerda em vez de caixa — é uma
          carta que chegou, não um cartão de dado. */}
      <div className="relative">
        <MarcaFaisca className="pointer-events-none absolute -left-16 top-1 hidden w-9 text-destaque lg:block" />
        <Cartao>
          <div className="border-l-2 border-tinta pl-5">
            <p className="legenda">de</p>
            <p className="mt-1 font-prosa text-lg text-tinta">{incremento.remetente}</p>
            <p className="mt-3 max-w-[62ch] font-prosa text-[1.0625rem] leading-relaxed text-tinta">
              {incremento.contexto}
            </p>
          </div>
        </Cartao>
      </div>

      <Cartao legenda="O que muda">
        <div className="flex flex-col gap-5">
          {incremento.mudancas.map((mudanca) => (
            <div key={mudanca.rotulo} className="border-b border-linha pb-4 last:border-b-0 last:pb-0">
              <h3 className="text-[0.9375rem] font-semibold tracking-tight text-tinta">
                {mudanca.rotulo}
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {mudanca.lacunas.map((lacuna) => (
                  <li key={lacuna.chave} className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta-media">
                    <span className="legenda">{lacuna.rotulo}</span>
                    <br />
                    <span className="text-tinta">{lacuna.valor}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Cartao>

      {/* "O que não muda" é o contrapeso: o pedido tem borda, e é essa borda que
          o design anterior torna difícil de ignorar (Doc 6 §4.2). */}
      <Cartao legenda="O que não muda" bloqueado>
        {incremento.itensImutaveis.length === 0 ? (
          <p className="text-tinta-media">O envelope não fixou nada como imutável.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {incremento.itensImutaveis.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-[0.55rem] h-px w-3 shrink-0 bg-portao" />
                <span className="max-w-[62ch] text-[0.9375rem] leading-snug text-tinta">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </Casca>
  )
}
