CREATE TABLE "notification_receipts" (
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_receipts_pkey" PRIMARY KEY ("userId", "notificationId")
);

CREATE INDEX "notification_receipts_notificationId_idx"
ON "notification_receipts"("notificationId");

ALTER TABLE "notification_receipts"
ADD CONSTRAINT "notification_receipts_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "user_notifications"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
