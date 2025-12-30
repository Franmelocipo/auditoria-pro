import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Auditoria Pro',
  description: 'Herramientas profesionales de auditoría contable',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-primary-600">
                    Auditoria Pro
                  </h1>
                </div>
                <div className="flex items-center space-x-4">
                  <a href="/auditoria" className="text-gray-600 hover:text-primary-600">
                    Auditoría
                  </a>
                  <a href="/conciliador" className="text-gray-600 hover:text-primary-600">
                    Conciliador
                  </a>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
