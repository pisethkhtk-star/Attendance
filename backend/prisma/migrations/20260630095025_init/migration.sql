-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'HR', 'Manager', 'Employee');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Active', 'Inactive', 'Suspended');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_kh" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_kh" TEXT NOT NULL,
    "department_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_kh" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "position_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "branch" TEXT NOT NULL,
    "join_date" DATE NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'Active',
    "shift_1_start" TEXT NOT NULL,
    "shift_1_end" TEXT NOT NULL,
    "shift_2_start" TEXT NOT NULL,
    "shift_2_end" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Employee',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "checkin_1" TEXT,
    "checkout_1" TEXT,
    "checkin_2" TEXT,
    "checkout_2" TEXT,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "is_early_leave" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "leave_date" DATE NOT NULL,
    "leave_type" TEXT NOT NULL,
    "amount_days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'Pending',
    "manager_name" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_staff_id_key" ON "employees"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "attendances_staff_id_idx" ON "attendances"("staff_id");

-- CreateIndex
CREATE INDEX "attendances_attendance_date_idx" ON "attendances"("attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_staff_id_attendance_date_key" ON "attendances"("staff_id", "attendance_date");

-- CreateIndex
CREATE INDEX "leaves_staff_id_idx" ON "leaves"("staff_id");

-- CreateIndex
CREATE INDEX "leaves_leave_date_idx" ON "leaves"("leave_date");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;
