-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('raw', 'semi', 'processed', 'finished', 'combo');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('active', 'draft', 'inactive');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('draft', 'pending', 'approved', 'in_production', 'delivering', 'completed', 'reconciled');

-- CreateEnum
CREATE TYPE "SalesOrderSource" AS ENUM ('customer', 'manual', 'ai_forecast', 'excel_import');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('created', 'submitted', 'approved', 'returned', 'status_changed');

-- CreateEnum
CREATE TYPE "BomVersionStatus" AS ENUM ('draft', 'effective', 'retired');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" VARCHAR(16) NOT NULL DEFAULT 'C类',
    "contact" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "settlement" VARCHAR(80) NOT NULL DEFAULT '现结',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "ProductType" NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "unit" VARCHAR(24) NOT NULL,
    "cost" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "safety_stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "RecordStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_name" VARCHAR(160) NOT NULL,
    "delivery_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'draft',
    "source" "SalesOrderSource" NOT NULL DEFAULT 'manual',
    "contact" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "notes" VARCHAR(1000),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_code" VARCHAR(32) NOT NULL,
    "product_name" VARCHAR(160) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" VARCHAR(24) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_events" (
    "id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "actor" VARCHAR(80) NOT NULL,
    "comment" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boms" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "boms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_versions" (
    "id" UUID NOT NULL,
    "bom_id" UUID NOT NULL,
    "version" VARCHAR(24) NOT NULL,
    "previous_version_id" UUID,
    "output_quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "output_unit" VARCHAR(24) NOT NULL,
    "status" "BomVersionStatus" NOT NULL DEFAULT 'draft',
    "effective_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bom_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_items" (
    "id" UUID NOT NULL,
    "bom_version_id" UUID NOT NULL,
    "component_product_id" UUID NOT NULL,
    "net_quantity" DECIMAL(14,6) NOT NULL,
    "yield_rate" DECIMAL(8,6) NOT NULL,
    "unit" VARCHAR(24) NOT NULL,
    "unit_cost_snapshot" DECIMAL(14,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_numbers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" VARCHAR(24) NOT NULL,
    "date_key" VARCHAR(8) NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "document_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "customers_organization_id_name_idx" ON "customers"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "customers_organization_id_code_key" ON "customers"("organization_id", "code");

-- CreateIndex
CREATE INDEX "products_organization_id_name_idx" ON "products"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_code_key" ON "products"("organization_id", "code");

-- CreateIndex
CREATE INDEX "sales_orders_organization_id_status_delivery_at_idx" ON "sales_orders"("organization_id", "status", "delivery_at");

-- CreateIndex
CREATE INDEX "sales_orders_organization_id_customer_id_idx" ON "sales_orders"("organization_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_organization_id_code_key" ON "sales_orders"("organization_id", "code");

-- CreateIndex
CREATE INDEX "sales_order_lines_sales_order_id_sort_order_idx" ON "sales_order_lines"("sales_order_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_lines_sales_order_id_product_id_key" ON "sales_order_lines"("sales_order_id", "product_id");

-- CreateIndex
CREATE INDEX "sales_order_events_sales_order_id_created_at_idx" ON "sales_order_events"("sales_order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "boms_organization_id_product_id_key" ON "boms"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "boms_organization_id_code_key" ON "boms"("organization_id", "code");

-- CreateIndex
CREATE INDEX "bom_versions_bom_id_status_effective_at_idx" ON "bom_versions"("bom_id", "status", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "bom_versions_bom_id_version_key" ON "bom_versions"("bom_id", "version");

-- CreateIndex
CREATE INDEX "bom_items_bom_version_id_sort_order_idx" ON "bom_items"("bom_version_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "bom_items_bom_version_id_component_product_id_key" ON "bom_items"("bom_version_id", "component_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_numbers_organization_id_kind_date_key_key" ON "document_numbers"("organization_id", "kind", "date_key");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_events" ADD CONSTRAINT "sales_order_events_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boms" ADD CONSTRAINT "boms_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_versions" ADD CONSTRAINT "bom_versions_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "boms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_versions" ADD CONSTRAINT "bom_versions_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "bom_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_bom_version_id_fkey" FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_items" ADD CONSTRAINT "bom_items_component_product_id_fkey" FOREIGN KEY ("component_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_numbers" ADD CONSTRAINT "document_numbers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
