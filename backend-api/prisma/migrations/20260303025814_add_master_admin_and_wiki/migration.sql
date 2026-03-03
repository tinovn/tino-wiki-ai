-- CreateEnum
CREATE TYPE "SuperAdminRole" AS ENUM ('SUPER_OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "MasterDocumentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MasterProcessingStatus" AS ENUM ('PENDING', 'CLEANING', 'CHUNKING', 'EMBEDDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "super_admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" "SuperAdminRole" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_documents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "status" "MasterDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "author_id" UUID NOT NULL,
    "category_id" UUID,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "change_note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_document_tags" (
    "document_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "master_document_tags_pkey" PRIMARY KEY ("document_id","tag_id")
);

-- CreateTable
CREATE TABLE "master_document_chunks" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "heading" TEXT,
    "token_count" INTEGER NOT NULL,
    "vector_id" TEXT,
    "version" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master_ai_processing_jobs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "MasterProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_ai_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "master_documents_slug_key" ON "master_documents"("slug");

-- CreateIndex
CREATE INDEX "master_documents_status_idx" ON "master_documents"("status");

-- CreateIndex
CREATE INDEX "master_documents_category_id_idx" ON "master_documents"("category_id");

-- CreateIndex
CREATE INDEX "master_documents_author_id_idx" ON "master_documents"("author_id");

-- CreateIndex
CREATE INDEX "master_documents_is_deleted_idx" ON "master_documents"("is_deleted");

-- CreateIndex
CREATE INDEX "master_document_versions_document_id_idx" ON "master_document_versions"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "master_document_versions_document_id_version_key" ON "master_document_versions"("document_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "master_categories_slug_key" ON "master_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "master_tags_name_key" ON "master_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "master_tags_slug_key" ON "master_tags"("slug");

-- CreateIndex
CREATE INDEX "master_document_chunks_document_id_idx" ON "master_document_chunks"("document_id");

-- CreateIndex
CREATE INDEX "master_document_chunks_vector_id_idx" ON "master_document_chunks"("vector_id");

-- CreateIndex
CREATE UNIQUE INDEX "master_document_chunks_document_id_chunk_index_version_key" ON "master_document_chunks"("document_id", "chunk_index", "version");

-- CreateIndex
CREATE INDEX "master_ai_processing_jobs_document_id_idx" ON "master_ai_processing_jobs"("document_id");

-- CreateIndex
CREATE INDEX "master_ai_processing_jobs_status_idx" ON "master_ai_processing_jobs"("status");

-- AddForeignKey
ALTER TABLE "master_documents" ADD CONSTRAINT "master_documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_documents" ADD CONSTRAINT "master_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_document_versions" ADD CONSTRAINT "master_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "master_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_categories" ADD CONSTRAINT "master_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "master_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_document_tags" ADD CONSTRAINT "master_document_tags_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "master_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_document_tags" ADD CONSTRAINT "master_document_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "master_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "master_document_chunks" ADD CONSTRAINT "master_document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "master_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
