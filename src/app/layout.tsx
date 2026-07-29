import type { Metadata } from 'next'
import { Archivo, IBM_Plex_Mono, Literata } from 'next/font/google'

import './globals.css'

// next/font baixa e auto-hospeda no build: nenhuma requisição a CDN em
// runtime, e nenhum fallback silencioso de fonte em produção.

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

const dadoMono = IBM_Plex_Mono({
  variable: '--font-dado-mono',
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PCP — Plataforma de Condução Pedagógica',
  description: 'Conduz o ciclo completo de um módulo de ensino baseado em projetos.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${dadoMono.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
