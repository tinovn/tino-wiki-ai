import { Module } from '@nestjs/common';
import { DocumentController } from './controllers/document.controller';
import { CategoryController } from './controllers/category.controller';
import { TagController } from './controllers/tag.controller';
import { DocumentService } from './services/document.service';
import { CategoryService } from './services/category.service';
import { TagService } from './services/tag.service';
import { DocumentRepository } from './repositories/document.repository';
import { VersionRepository } from './repositories/version.repository';
import { CategoryRepository } from './repositories/category.repository';
import { TagRepository } from './repositories/tag.repository';

@Module({
  controllers: [DocumentController, CategoryController, TagController],
  providers: [
    DocumentService,
    CategoryService,
    TagService,
    DocumentRepository,
    VersionRepository,
    CategoryRepository,
    TagRepository,
  ],
  exports: [DocumentService],
})
export class WikiModule {}
