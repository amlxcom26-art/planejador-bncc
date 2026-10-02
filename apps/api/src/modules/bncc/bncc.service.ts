import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuerySkillsDto } from './dto/query-skills.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BnccService {
  constructor(private readonly prisma: PrismaService) {}

  async findSkills(query: QuerySkillsDto) {
    const where: Prisma.BnccSkillWhereInput = {};

    if (query.nivel) {
      where.nivel = { contains: query.nivel, mode: 'insensitive' };
    }

    if (query.ano !== undefined) {
      where.ano = query.ano;
    }

    if (query.eixo) {
      where.eixo = { contains: query.eixo, mode: 'insensitive' };
    }

    if (query.q) {
      const searchTerm = query.q.trim();
      where.OR = [
        { codigo: { contains: searchTerm, mode: 'insensitive' } },
        { descricao: { contains: searchTerm, mode: 'insensitive' } },
        { explicacao: { contains: searchTerm, mode: 'insensitive' } },
        { exemplos: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.bnccSkill.findMany({
      where,
      orderBy: { codigo: 'asc' },
    });

    return {
      total: items.length,
      items,
    };
  }

  async findSkillById(id: string) {
    return this.prisma.bnccSkill.findUnique({
      where: { id },
    });
  }
}
