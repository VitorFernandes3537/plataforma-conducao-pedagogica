import { MarcaLaco, MarcaSeta } from '@/components/marcas'

type Tom = 'tenue' | 'tinta' | 'destaque' | 'portao'

const COR_DO_TOM: Record<Tom, string> = {
  tenue: 'text-tinta-tenue',
  tinta: 'text-tinta-media',
  destaque: 'text-destaque',
  portao: 'text-portao',
}

/** Inclinação leve. Reta demais lê como interface; torta demais lê como piada. */
const INCLINACAO = {
  esquerda: '-rotate-2',
  nenhuma: '',
  direita: 'rotate-2',
} as const

type PropsBase = {
  children: React.ReactNode
  tom?: Tom
  inclinacao?: keyof typeof INCLINACAO
  tamanho?: 'normal' | 'grande'
  className?: string
}

/**
 * Anotação à mão.
 *
 * A voz de quem escreveu na margem — comentário, lembrete, ênfase. Nunca
 * carrega informação que só exista aqui: se a frase for indispensável, ela
 * pertence ao corpo da interface, não à margem.
 */
export function Anotacao({
  children,
  tom = 'tenue',
  inclinacao = 'esquerda',
  tamanho = 'normal',
  className = '',
}: PropsBase) {
  return (
    <p
      className={`mao ${COR_DO_TOM[tom]} ${INCLINACAO[inclinacao]} ${
        tamanho === 'grande' ? 'text-2xl' : ''
      } ${className}`}
    >
      {children}
    </p>
  )
}

/**
 * Anotação na margem, fora da coluna de texto.
 *
 * O posicionamento absoluto é deliberado: a margem é onde a marca pertence.
 * Some abaixo de `xl`, porque em tela estreita não existe margem para ocupar —
 * e anotação por cima de conteúdo é o erro que esta regra evita.
 */
export function AnotacaoNaMargem({
  children,
  lado = 'direita',
  tom = 'tenue',
  inclinacao = 'direita',
  className = '',
}: PropsBase & { lado?: 'esquerda' | 'direita' }) {
  const posicao = lado === 'direita' ? '-right-44 xl:block' : '-left-44 xl:block'
  return (
    <div className={`pointer-events-none absolute hidden w-40 ${posicao} ${className}`}>
      <Anotacao tom={tom} inclinacao={inclinacao}>
        {children}
      </Anotacao>
    </div>
  )
}

/**
 * Anotação com seta apontando para o que está ao lado.
 *
 * A seta é espelhada quando aponta da direita, para o traço nunca sair
 * invertido em relação ao texto.
 */
export function AnotacaoApontando({
  children,
  aponta = 'esquerda',
  tom = 'tenue',
  className = '',
}: PropsBase & { aponta?: 'esquerda' | 'direita' }) {
  const cor =
    tom === 'destaque'
      ? 'var(--color-destaque)'
      : tom === 'portao'
        ? 'var(--color-portao)'
        : 'var(--color-tinta-tenue)'

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {aponta === 'esquerda' && (
        <MarcaSeta className="h-8 w-14 shrink-0 -scale-x-100" cor={cor} />
      )}
      <Anotacao tom={tom} inclinacao={aponta === 'esquerda' ? 'direita' : 'esquerda'}>
        {children}
      </Anotacao>
      {aponta === 'direita' && <MarcaSeta className="h-8 w-14 shrink-0" cor={cor} />}
    </div>
  )
}

/**
 * Laço à mão em volta do conteúdo.
 *
 * Ênfase de quem circulou no papel. O laço não fecha de propósito — é assim
 * que se sabe que é mão e não borda.
 */
export function Circundado({
  children,
  tom = 'destaque',
}: {
  children: React.ReactNode
  tom?: Extract<Tom, 'destaque' | 'portao' | 'tenue'>
}) {
  const cor =
    tom === 'destaque'
      ? 'var(--color-destaque)'
      : tom === 'portao'
        ? 'var(--color-portao)'
        : 'var(--color-tinta-tenue)'

  return (
    <span className="relative inline-block">
      <span className="relative">{children}</span>
      <MarcaLaco
        className="pointer-events-none absolute -inset-x-4 -inset-y-2.5 h-[calc(100%+1.25rem)] w-[calc(100%+2rem)]"
        cor={cor}
      />
    </span>
  )
}
