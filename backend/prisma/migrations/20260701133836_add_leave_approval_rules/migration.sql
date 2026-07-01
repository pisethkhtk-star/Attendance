-- CreateTable
CREATE TABLE "leave_approval_rules" (
    "id" UUID NOT NULL,
    "approver_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'Employee',
    "target_dept_id" UUID,
    "target_staff_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_approval_rules_pkey" PRIMARY KEY ("id")
);
