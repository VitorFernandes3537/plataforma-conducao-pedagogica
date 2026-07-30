// Captura de tela para inspeção visual durante o desenvolvimento.
//
// Existe porque revisar design sem olhar o resultado produz decisão baseada
// em intenção, não em evidência. Roda headless, então não depende de nenhuma
// janela visível.
//
// Uso: node scripts/captura.mjs <caminho-da-rota> [largura] [nome-do-arquivo]
//   node scripts/captura.mjs /rumo-visual 1440 rumo

import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const [rotaBruta = '/', largura = '1440', nome = 'tela'] = process.argv.slice(2)
const base = process.env.BASE_URL ?? 'http://localhost:3000'

// O Git Bash no Windows converte "/rota" em caminho absoluto do sistema. Aceita
// os dois formatos e recupera só o último segmento quando isso acontece.
const rota = rotaBruta.includes(':/')
  ? `/${rotaBruta.split('/').filter(Boolean).pop()}`
  : rotaBruta.startsWith('/')
    ? rotaBruta
    : `/${rotaBruta}`
const destino = 'capturas'

await mkdir(destino, { recursive: true })

const navegador = await chromium.launch()
const pagina = await navegador.newPage({
  viewport: { width: Number(largura), height: 900 },
  deviceScaleFactor: 2,
})

const resposta = await pagina.goto(`${base}${rota}`, { waitUntil: 'networkidle' })
if (!resposta?.ok()) {
  await navegador.close()
  throw new Error(`${rota} respondeu ${resposta?.status()}`)
}

// Fontes precisam estar carregadas, senão a captura mostra o fallback.
await pagina.evaluate(() => document.fonts.ready)

const erros = []
pagina.on('console', (m) => {
  if (m.type() === 'error') erros.push(m.text())
})

const arquivo = `${destino}/${nome}.png`
await pagina.screenshot({ path: arquivo, fullPage: true })
await navegador.close()

console.log(`capturado: ${arquivo}`)
if (erros.length) console.log(`erros de console: ${erros.length}\n${erros.join('\n')}`)
