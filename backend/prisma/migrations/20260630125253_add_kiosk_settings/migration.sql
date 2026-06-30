-- CreateTable
CREATE TABLE "kiosk_settings" (
    "id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 11.5564,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 104.9282,
    "radius" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kiosk_settings_pkey" PRIMARY KEY ("id")
);
