import { redirect } from 'next/navigation'

import { EscolhaDeTema } from '@/components/aluno/escolha-de-tema'
import {
  FormularioDeEscopo,
  type PapelDaTraducao,
  type PerguntaDoEscopo,
} from '@/components/aluno/formulario-de-escopo'
import { AusenciaDeclarada, Aviso, Cabecalho, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { temaDoGrupo } from '@/db/alocacao'
import { cursoDaTurma } from '@/db/curso'
import { matriculaDoUsuario } from '@/db/dia-do-aluno'
import { perguntasDoFormularioEmOrdem, formularioDoCurso } from '@/db/formulario'
import { respostaDoGrupo, traducaoDoEscopo } from '@/db/resposta-de-escopo'
import { temasDoCurso } from '@/db/temas'
import { estadosEditaveisPeloGrupo, type EstadoDoEscopo } from '@/domain/escopo'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Escopo — PCP' }

/**
 * O formulário de escopo do grupo (Doc 2 §4).
 *
 * É a tela do portão. O D3 é go/no-go duro e nenhuma linha de código do projeto
 * é escrita antes da aprovação (Doc 4 §4), então esta é a primeira tela da fila
 * da ADR 0006 §5 — sem ela, nada depois dela acontece.
 *
 * A ordem da tela é a ordem do trabalho: o tema primeiro, porque sem domínio
 * escolhido não há o que responder; depois as perguntas; e a tabela de tradução
 * por último, porque ela nomeia o que as respostas descreveram.
 *
 * Quantas perguntas existem, quantos papéis a estrutura tem e quais temas o
 * curso oferece **vêm todos do dado**. Nada aqui conta nem confere quantidade.
 */
export default async function Escopo() {
  const sessao = await auth()
  if (!sessao?.usuarioId) redirect('/entrar?callbackUrl=/escopo')

  const banco = db()
  const matricula = await matriculaDoUsuario(banco, sessao.usuarioId)

  if (!matricula) {
    return (
      <Casca>
        <Cabecalho legenda="Escopo" titulo="Você ainda não está numa turma" />
        <AusenciaDeclarada legenda="Matrícula">
          O instrutor cadastra a turma por usuário do GitHub. Quando ele te
          incluir, o formulário do seu grupo aparece aqui.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  if (!matricula.grupoId) {
    return (
      <Casca>
        <Cabecalho legenda="Escopo" titulo="O formulário é do grupo" />
        <AusenciaDeclarada legenda="Grupo">
          O escopo é preenchido e entregue uma vez por grupo. Enquanto você não
          estiver num, não há formulário para abrir — nem o seu, nem o de
          ninguém.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const curso = await cursoDaTurma(banco, matricula.turmaId)
  const formulario = curso ? await formularioDoCurso(banco, curso.id) : null

  if (!curso || !formulario) {
    return (
      <Casca>
        <Cabecalho legenda="Escopo" titulo="O formulário ainda não foi cadastrado" />
        <AusenciaDeclarada legenda="Formulário do curso">
          As perguntas do escopo são configuração do curso, e o instrutor ainda
          não as cadastrou. Sem elas não há o que responder.
        </AusenciaDeclarada>
      </Casca>
    )
  }

  const [escopo, perguntas, temas, temaDoMeuGrupo] = await Promise.all([
    respostaDoGrupo(banco, matricula.grupoId),
    perguntasDoFormularioEmOrdem(banco, formulario.id),
    temasDoCurso(banco, curso.id, matricula.turmaId),
    // Qual tema é DESTE grupo tem de vir do grupo. Deduzir por "indisponível na
    // turma" pegaria o tema de qualquer outro — indisponível quer dizer tomado
    // por alguém, não tomado por mim.
    temaDoGrupo(banco, matricula.grupoId),
  ])

  // O rascunho ainda não existe na primeira abertura, e não é esta página que o
  // cria: leitura que grava vira linha fantasma no primeiro prefetch. Quem abre
  // o rascunho é a primeira gravação, na server action.
  const traducao = await traducaoDoEscopo(banco, escopo?.id ?? null, curso.id)

  const estado: EstadoDoEscopo = escopo?.estado ?? 'rascunho'
  const editavel = estadosEditaveisPeloGrupo().includes(estado)

  const temaAtual = temaDoMeuGrupo ? (temas.find((t) => t.id === temaDoMeuGrupo) ?? null) : null

  const respondidas: PerguntaDoEscopo[] = perguntas.map((pergunta) => ({
    id: pergunta.id,
    ordem: pergunta.ordem,
    enunciado: pergunta.enunciado,
    criterioDeAceite: pergunta.criterioDeAceite,
    texto: escopo?.respostas.find((r) => r.perguntaId === pergunta.id)?.texto ?? '',
  }))

  const papeis: PapelDaTraducao[] = traducao.map((linha) => ({
    papelId: linha.papelId,
    ordem: linha.ordem,
    nome: linha.nome,
    obrigatorio: linha.obrigatorio,
    nomeNoNegocio: linha.nomeNoNegocio ?? '',
    nomeNoCodigo: linha.nomeNoCodigo ?? '',
  }))

  return (
    <Casca>
      <Cabecalho
        legenda="Escopo"
        titulo={TITULO[estado]}
        acoes={<Etiqueta tom={TOM[estado]}>{estado}</Etiqueta>}
      >
        {DESCRICAO[estado]}
      </Cabecalho>

      {estado === 'devolvido' && escopo?.motivoDaDevolucao && (
        <Aviso tom="portao" className="max-w-[62ch]">
          <strong className="font-medium">O que o instrutor pediu para corrigir:</strong>{' '}
          <span className="text-tinta-media">{escopo.motivoDaDevolucao}</span>
        </Aviso>
      )}

      <EscolhaDeTema
        temas={temas}
        temaEscolhido={
          temaAtual
            ? { id: temaAtual.id, nome: temaAtual.nome, briefing: temaAtual.briefing }
            : null
        }
      />

      {perguntas.length === 0 ? (
        <AusenciaDeclarada legenda="Perguntas">
          O formulário deste curso existe mas ainda não tem perguntas. Elas são
          configuração, e quem as cadastra é o instrutor.
        </AusenciaDeclarada>
      ) : (
        <FormularioDeEscopo
          perguntas={respondidas}
          traducao={papeis}
          editavel={editavel}
          entregue={estado === 'submetido' || estado === 'aprovado'}
        />
      )}
    </Casca>
  )
}

const TITULO: Record<EstadoDoEscopo, string> = {
  rascunho: 'O escopo do seu grupo',
  submetido: 'Entregue, esperando o instrutor',
  aprovado: 'Escopo aprovado',
  devolvido: 'Voltou para correção',
}

const TOM: Record<EstadoDoEscopo, 'neutro' | 'destaque' | 'portao' | 'tinta'> = {
  rascunho: 'neutro',
  submetido: 'tinta',
  aprovado: 'destaque',
  devolvido: 'portao',
}

const DESCRICAO: Record<EstadoDoEscopo, string> = {
  rascunho:
    'É preenchido e entregue uma vez por grupo, no vocabulário do negócio e não no de programação. Nenhuma resposta pode ser "depende" ou "a definir".',
  submetido:
    'O grupo não edita depois de entregar — a fila do instrutor não pode ser um alvo móvel. Se voltar para correção, o que ele pediu aparece aqui em cima.',
  aprovado:
    'A partir daqui ele é o gabarito de correção do projeto inteiro, e é a base do envelope de incremento. O grupo não o altera mais.',
  devolvido:
    'Corrija o que está apontado e entregue de novo. A conferência automática roda outra vez antes de o formulário voltar para a fila.',
}
