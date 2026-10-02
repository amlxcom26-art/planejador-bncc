import { z } from 'zod';

export const N8nRequestSchema = z.object({
  sessao: z.string().min(1, 'A identificação de sessão (e-mail) é obrigatória.'),
  habilidade: z.string().min(1, 'O texto da habilidade é obrigatório.'),
  instrucao: z.string().min(10, 'A instrução pedagógica deve conter pelo menos 10 caracteres.').max(1000),
  duracao: z.number().int().min(15).max(360),
  recursos_digitais: z.boolean(),
});

export type N8nRequestPayload = z.infer<typeof N8nRequestSchema>;

export const N8nResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10, 'O conteúdo retornado deve possuir no mínimo 10 caracteres.'),
  format: z.literal('markdown'),
});

export type N8nResponse = z.infer<typeof N8nResponseSchema>;
