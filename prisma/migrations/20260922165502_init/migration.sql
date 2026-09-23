-- CreateTable
CREATE TABLE `Zone` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `points` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaFile` (
    `id` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mediaType` ENUM('photo', 'video') NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Analysis` (
    `id` VARCHAR(191) NOT NULL,
    `mediaId` VARCHAR(191) NOT NULL,
    `detectorMode` VARCHAR(191) NOT NULL DEFAULT 'proxy',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `photoCount` INTEGER NOT NULL DEFAULT 0,
    `videoDuration` DOUBLE NOT NULL DEFAULT 0,
    `analyzedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Violation` (
    `id` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NOT NULL,
    `zoneId` VARCHAR(191) NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `bbox` JSON NOT NULL,
    `coordinateSource` ENUM('gps_exif', 'ocr', 'manual') NOT NULL,
    `startTimeSec` DOUBLE NULL,
    `endTimeSec` DOUBLE NULL,
    `address` VARCHAR(191) NULL,
    `locationStatus` VARCHAR(191) NOT NULL DEFAULT 'matched',
    `status` ENUM('pending_review', 'valid', 'rejected') NOT NULL DEFAULT 'pending_review',
    `followUp` ENUM('belum', 'sudah') NOT NULL DEFAULT 'belum',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnotatedFrame` (
    `id` VARCHAR(191) NOT NULL,
    `violationId` VARCHAR(191) NOT NULL,
    `imagePath` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `analysisId` VARCHAR(191) NOT NULL,
    `totalViolations` INTEGER NOT NULL DEFAULT 0,
    `coverageSummary` VARCHAR(191) NOT NULL,
    `pdfPath` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Report_analysisId_key`(`analysisId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_mediaId_fkey` FOREIGN KEY (`mediaId`) REFERENCES `MediaFile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Violation` ADD CONSTRAINT `Violation_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `Analysis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Violation` ADD CONSTRAINT `Violation_zoneId_fkey` FOREIGN KEY (`zoneId`) REFERENCES `Zone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnotatedFrame` ADD CONSTRAINT `AnnotatedFrame_violationId_fkey` FOREIGN KEY (`violationId`) REFERENCES `Violation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_analysisId_fkey` FOREIGN KEY (`analysisId`) REFERENCES `Analysis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
