-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "resource" TEXT NOT NULL,
    "can_access" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_resource_key" ON "role_permissions"("role", "resource");
