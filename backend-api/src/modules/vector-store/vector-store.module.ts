import { Global, Module } from '@nestjs/common';
import { QdrantService } from './qdrant.service';
import { CollectionManager } from './collection.manager';
import { VectorStoreService } from './vector-store.service';

@Global()
@Module({
  providers: [QdrantService, CollectionManager, VectorStoreService],
  exports: [QdrantService, CollectionManager, VectorStoreService],
})
export class VectorStoreModule {}
