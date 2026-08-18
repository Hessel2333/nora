import { Injectable, NotFoundException } from "@nestjs/common";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { Create{{Feature}}Dto } from "./dto/create-{{feature}}.dto.js";

@Injectable()
export class {{Feature}}Service {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string) {
    const record = await this.prisma.{{feature}}.findFirst({
      where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
    });
    if (!record) throw new NotFoundException("记录不存在");
    return record;
  }

  async create(input: Create{{Feature}}Dto) {
    return this.prisma.$transaction((tx) =>
      tx.{{feature}}.create({
        data: { organizationId: DEFAULT_ORGANIZATION_ID, ...input },
      }),
    );
  }
}
