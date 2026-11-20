-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "confirmationMessageTemplate" TEXT NOT NULL DEFAULT 'Hola {{clientName}}, te confirmamos tu cita de {{service}} el {{date}} a las {{time}} en {{business}}. ¡Te esperamos!';
