-- CreateTable
CREATE TABLE "employee_leave_limits" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "leave_code" TEXT NOT NULL,
    "max_days" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_leave_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_limits_staff_id_leave_code_key" ON "employee_leave_limits"("staff_id", "leave_code");

-- AddForeignKey
ALTER TABLE "employee_leave_limits" ADD CONSTRAINT "employee_leave_limits_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_limits" ADD CONSTRAINT "employee_leave_limits_leave_code_fkey" FOREIGN KEY ("leave_code") REFERENCES "leave_types"("code") ON DELETE CASCADE ON UPDATE CASCADE;
