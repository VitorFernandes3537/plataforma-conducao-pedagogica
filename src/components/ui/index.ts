// Barril dos primitivos de interface.
//
// Componente de domínio (régua, tarja, desafio) mora em `src/components`.
// Aqui ficam as peças reutilizáveis que qualquer tela monta.

export { Anotacao, AnotacaoApontando, AnotacaoNaMargem, Circundado } from './anotacao'
export { Botao } from './botao'
export { Cabecalho, Destaque } from './cabecalho'
export { Casca } from './casca'
export { Cartao, Linha } from './cartao'
export { Campo, CampoDeProsa } from './campo'
export { Escala, type NotaDaEscala } from './escala'
export { ErroDaAcao } from './erro-da-acao'
export { Aviso, AusenciaDeclarada, EstadoVazio } from './estado'
export { Etiqueta, EtiquetaCheia } from './etiqueta'
export { Logotipo } from './logotipo'
export {
  ListaDeVerificacao,
  ListaForaDeEscopo,
  MarcaBinaria,
  type ItemDeVerificacao,
} from './marca-binaria'
