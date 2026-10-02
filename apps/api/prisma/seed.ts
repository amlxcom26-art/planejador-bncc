import { PrismaClient, PlanStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BnccSkillRaw {
  nivel: string;
  ano: number;
  eixo: string;
  codigo: string;
  descricao: string;
  explicacao: string;
  exemplos: string;
}

async function main() {
  console.log('--- Iniciando Seed do Banco de Dados Planejador BNCC ---');

  // 1. Carregar habilidades BNCC de docs/data/bncc-recorte.json
  const bnccFilePath = path.resolve(__dirname, '../../../docs/data/bncc-recorte.json');
  if (!fs.existsSync(bnccFilePath)) {
    throw new Error(`Arquivo BNCC não encontrado em: ${bnccFilePath}`);
  }

  const rawData = fs.readFileSync(bnccFilePath, 'utf-8');
  const bnccSkills: BnccSkillRaw[] = JSON.parse(rawData);

  console.log(`Populando ${bnccSkills.length} habilidades da BNCC...`);
  for (const skill of bnccSkills) {
    await prisma.bnccSkill.upsert({
      where: { codigo: skill.codigo },
      update: {
        nivel: skill.nivel,
        ano: skill.ano,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao,
        exemplos: skill.exemplos,
      },
      create: {
        codigo: skill.codigo,
        nivel: skill.nivel,
        ano: skill.ano,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao,
        exemplos: skill.exemplos,
      },
    });
  }

  // 2. Criar ou atualizar contas docentes de demonstração
  const passwordHash = await bcrypt.hash('demo123', 10);

  const ana = await prisma.user.upsert({
    where: { email: 'ana@demo.bncc.br' },
    update: {
      name: 'Profª Ana Souza',
      passwordHash,
    },
    create: {
      name: 'Profª Ana Souza',
      email: 'ana@demo.bncc.br',
      passwordHash,
    },
  });
  console.log(`Docente garantido: ${ana.name} (${ana.email})`);

  const marcos = await prisma.user.upsert({
    where: { email: 'marcos@demo.bncc.br' },
    update: {
      name: 'Prof. Marcos Lima',
      passwordHash,
    },
    create: {
      name: 'Prof. Marcos Lima',
      email: 'marcos@demo.bncc.br',
      passwordHash,
    },
  });
  console.log(`Docente garantido: ${marcos.name} (${marcos.email})`);

  // 3. Criar planos iniciais para Profª Ana Souza (para permitir teste imediato de listagem e edição)
  const skillEF01 = await prisma.bnccSkill.findUnique({ where: { codigo: 'EF01CO01' } });
  const skillEF02 = await prisma.bnccSkill.findUnique({ where: { codigo: 'EF01CO02' } });
  const skillEF04 = await prisma.bnccSkill.findUnique({ where: { codigo: 'EF02CO04' } });
  const skillEF06 = await prisma.bnccSkill.findUnique({ where: { codigo: 'EF02CO06' } });

  const existingAnaPlans = await prisma.plan.count({ where: { userId: ana.id } });
  if (existingAnaPlans === 0 && skillEF01 && skillEF02 && skillEF04 && skillEF06) {
    console.log('Criando 4 rascunhos iniciais de demonstração para a Profª Ana Souza...');

    const plan1 = await prisma.plan.create({
      data: {
        userId: ana.id,
        title: 'Organizando Objetos e Identificando Padrões',
        duration: 50,
        digitalResources: false,
        pedagogicalInstruction: 'Atividade desplugada com cartões coloridos para classificação em duplas.',
        status: PlanStatus.RASCUNHO,
        isAiAssisted: true,
        contentMarkdown: `# Plano de Aula: Organizando Objetos e Padrões\n\n## 1. Objetivos\n- Classificar objetos segundo atributos de cor, forma e tamanho.\n- Reconhecer padrões sequenciais em duplas.\n\n## 2. Desenvolvimento\n- **Acolhimento (10 min):** Apresentação dos materiais.\n- **Prática (30 min):** Desafio de separação e agrupamento de cartões.\n- **Conclusão (10 min):** Roda de conversa sobre as regras criadas por cada dupla.\n\n## 3. Avaliação\nObservação contínua da capacidade de explicar os critérios de agrupamento.`,
        skills: {
          create: [{ skillId: skillEF01.id }],
        },
      },
    });

    const plan2 = await prisma.plan.create({
      data: {
        userId: ana.id,
        title: 'Sequências e Algoritmos no Nosso Dia a Dia',
        duration: 45,
        digitalResources: false,
        pedagogicalInstruction: 'Explorar receitas e trajetos no pátio para introduzir algoritmos.',
        status: PlanStatus.RASCUNHO,
        isAiAssisted: true,
        contentMarkdown: `# Plano de Aula: Sequências no Cotidiano\n\n## 1. Objetivos\n- Identificar passos lógicos em tarefas simples (escovar dentes, trocar de roupa).\n- Seguir uma sequência de passos orientada por colegas.\n\n## 2. Atividades\n- Simulação do 'robô humano' no pátio da escola.`,
        skills: {
          create: [{ skillId: skillEF02.id }],
        },
      },
    });

    const plan3 = await prisma.plan.create({
      data: {
        userId: ana.id,
        title: 'Diferenciando Hardware e Software na Prática',
        duration: 60,
        digitalResources: true,
        pedagogicalInstruction: 'Uso do laboratório de informática para identificar componentes físicos e aplicativos.',
        status: PlanStatus.RASCUNHO,
        isAiAssisted: true,
        contentMarkdown: `# Plano de Aula: Hardware e Software\n\n## 1. Objetivos\n- Compreender a diferença entre o aparelho físico e os programas executados nele.\n\n## 2. Recursos\n- Computadores ou tablets da escola com jogos educativos GCompris.`,
        skills: {
          create: [{ skillId: skillEF04.id }],
        },
      },
    });

    const plan4 = await prisma.plan.create({
      data: {
        userId: ana.id,
        title: 'Cultura Digital: Segurança e Cuidados na Internet',
        duration: 50,
        digitalResources: true,
        pedagogicalInstruction: 'Roda de conversa interativa sobre dados pessoais e senhas seguras.',
        status: PlanStatus.RASCUNHO,
        isAiAssisted: true,
        contentMarkdown: `# Plano de Aula: Segurança e Privacidade Online\n\n## 1. Objetivos\n- Reconhecer a importância de não compartilhar senhas e dados íntimos.\n- Construir um guia ilustrado de boas práticas para a turma.`,
        skills: {
          create: [{ skillId: skillEF06.id }],
        },
      },
    });

    console.log(`Planos criados com sucesso: ${plan1.id}, ${plan2.id}, ${plan3.id}, ${plan4.id}`);
  } else {
    console.log(`Profª Ana Souza já possui ${existingAnaPlans} planos. Seed preservado de forma idempotente.`);
  }

  console.log('--- Seed Concluído com Sucesso ---');
}

main()
  .catch((e) => {
    console.error('Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
