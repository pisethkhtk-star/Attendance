-- CreateTable
CREATE TABLE "company_work_hours" (
    "id" UUID NOT NULL,
    "shift_1_start" TEXT NOT NULL DEFAULT '08:00',
    "shift_1_end" TEXT NOT NULL DEFAULT '12:00',
    "shift_2_start" TEXT NOT NULL DEFAULT '13:00',
    "shift_2_end" TEXT NOT NULL DEFAULT '17:00',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_work_hours_pkey" PRIMARY KEY ("id")
);
