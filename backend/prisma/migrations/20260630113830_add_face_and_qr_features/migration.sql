-- CreateTable
CREATE TABLE "employee_face_data" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "face_descriptor" JSONB NOT NULL,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_face_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_qr_codes" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "qr_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" UUID NOT NULL,
    "staff_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_info" TEXT,
    "location" TEXT,
    "photo_snapshot_url" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_qr_codes_qr_token_key" ON "employee_qr_codes"("qr_token");

-- AddForeignKey
ALTER TABLE "employee_face_data" ADD CONSTRAINT "employee_face_data_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_qr_codes" ADD CONSTRAINT "employee_qr_codes_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "employees"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;
