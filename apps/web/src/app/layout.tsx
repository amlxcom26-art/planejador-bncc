import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Planejador BNCC',
  description: 'Planejador de Aulas alinhado à Base Nacional Comum Curricular',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
