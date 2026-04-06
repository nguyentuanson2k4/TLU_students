import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentTypeService } from './document-type.service';
import {
  DocumentTypeController,
  AdminDocumentTypeController,
} from './document-type.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentTypeController, AdminDocumentTypeController],
  providers: [DocumentTypeService],
  exports: [DocumentTypeService],
})
export class DocumentTypesModule {}
