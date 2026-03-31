-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT', 'LECTURER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "Degree" AS ENUM ('BACHELOR', 'MASTER', 'PHD');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('FACE_ID', 'MANUAL', 'QR_CODE');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'BOT');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "student_code" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "class_name" VARCHAR(50) NOT NULL,
    "address" VARCHAR(255),
    "gpa" DECIMAL(3,2),
    "vector_db_ref" VARCHAR(255),
    "is_face_registered" BOOLEAN NOT NULL DEFAULT false,
    "email" VARCHAR(255) NOT NULL,
    "major_name" VARCHAR(255),
    "department_name" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturers" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "lecturer_code" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "department" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "major_name" VARCHAR(255),
    "degree" "Degree" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" BIGSERIAL NOT NULL,
    "subject_code" VARCHAR(50) NOT NULL,
    "subject_name" VARCHAR(255) NOT NULL,
    "credits" INTEGER NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" BIGSERIAL NOT NULL,
    "semester_name" VARCHAR(50) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_classes" (
    "id" BIGSERIAL NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "lecturer_id" BIGINT NOT NULL,
    "semester_id" BIGINT NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "room" VARCHAR(50),
    "schedule" VARCHAR(255),
    "max_students" INTEGER,
    "current_students" INTEGER,
    "day_of_week" SMALLINT NOT NULL,
    "lesson_slot" VARCHAR(50) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_enrollments" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "course_class_id" BIGINT NOT NULL,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "course_class_id" BIGINT NOT NULL,
    "enrollment_id" BIGINT NOT NULL,
    "score_attendance" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "score_process" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "score_final" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "score_total_10" DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpa_history" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "semester_id" BIGINT NOT NULL,
    "gpa_semester" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "gpa_cumulative" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpa_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_sessions" (
    "id" BIGSERIAL NOT NULL,
    "course_class_id" BIGINT NOT NULL,
    "check_in_time" TIME,
    "date" DATE,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" BIGSERIAL NOT NULL,
    "session_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    "arrival_time" TIMESTAMP(3),
    "status" SMALLINT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_manual_override" BOOLEAN NOT NULL DEFAULT false,
    "evidence_url" VARCHAR(500),
    "attendance_method" "AttendanceMethod" NOT NULL DEFAULT 'FACE_ID',
    "updated_by" BIGINT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "status" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "session_id" BIGINT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "message_content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_intents" (
    "id" BIGSERIAL NOT NULL,
    "intent_name" VARCHAR(255),
    "description" VARCHAR(500),

    CONSTRAINT "chat_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_entities" (
    "id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_value" VARCHAR(255),

    CONSTRAINT "chat_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_history_analysis" (
    "id" BIGSERIAL NOT NULL,
    "message_id" BIGINT NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "intent_id" BIGINT NOT NULL,

    CONSTRAINT "chat_history_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_response_templates" (
    "id" BIGSERIAL NOT NULL,
    "intent_id" BIGINT NOT NULL,
    "template_text" TEXT,

    CONSTRAINT "system_response_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_mapping" (
    "id" BIGSERIAL NOT NULL,
    "intent_id" BIGINT NOT NULL,
    "action_name" VARCHAR(100),
    "target_table" VARCHAR(100),

    CONSTRAINT "workflow_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" BIGSERIAL NOT NULL,
    "document_name" VARCHAR(500),
    "file_path" BYTEA,
    "vector_db_collection" VARCHAR(100),
    "status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_training_dataset" (
    "id" BIGSERIAL NOT NULL,
    "sample_question" TEXT,
    "intent_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_training_dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_config" (
    "id" BIGSERIAL NOT NULL,
    "model_name" VARCHAR(100),
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "api_key_alias" VARCHAR(255),
    "version" VARCHAR(50),

    CONSTRAINT "ai_model_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" BIGSERIAL NOT NULL,
    "author_id" BIGINT NOT NULL,
    "course_class_id" BIGINT,
    "subject_id" BIGINT,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT,
    "post_type" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50),

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_interaction" (
    "id" BIGSERIAL NOT NULL,
    "post_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" BIGSERIAL NOT NULL,
    "user_id_1" BIGINT NOT NULL,
    "user_id_2" BIGINT NOT NULL,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" BIGINT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" BIGSERIAL NOT NULL,
    "document_name" VARCHAR(255),
    "processing_days" SMALLINT,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "document_type_id" BIGINT NOT NULL,
    "reason" VARCHAR(500),
    "attachment_url" VARCHAR(500),
    "status" SMALLINT NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warning_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "category" VARCHAR(100),
    "severity" "WarningSeverity" NOT NULL,
    "content" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "title" VARCHAR(255),
    "message" TEXT,
    "notification_type" VARCHAR(50),
    "source_id" BIGINT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_fees" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "semester_id" BIGINT NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "tuition_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuition_payments" (
    "id" BIGSERIAL NOT NULL,
    "tuition_fee_id" BIGINT NOT NULL,
    "amount_paid" DECIMAL(15,2) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "transaction_id" VARCHAR(100) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tuition_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_user_id_key" ON "lecturers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_lecturer_code_key" ON "lecturers"("lecturer_code");

-- CreateIndex
CREATE UNIQUE INDEX "lecturers_email_key" ON "lecturers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_subject_code_key" ON "subjects"("subject_code");

-- CreateIndex
CREATE INDEX "course_classes_subject_id_idx" ON "course_classes"("subject_id");

-- CreateIndex
CREATE INDEX "course_classes_lecturer_id_idx" ON "course_classes"("lecturer_id");

-- CreateIndex
CREATE INDEX "course_classes_semester_id_idx" ON "course_classes"("semester_id");

-- CreateIndex
CREATE INDEX "class_enrollments_student_id_idx" ON "class_enrollments"("student_id");

-- CreateIndex
CREATE INDEX "class_enrollments_course_class_id_idx" ON "class_enrollments"("course_class_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_student_id_course_class_id_key" ON "class_enrollments"("student_id", "course_class_id");

-- CreateIndex
CREATE INDEX "grades_student_id_idx" ON "grades"("student_id");

-- CreateIndex
CREATE INDEX "grades_course_class_id_idx" ON "grades"("course_class_id");

-- CreateIndex
CREATE INDEX "grades_enrollment_id_idx" ON "grades"("enrollment_id");

-- CreateIndex
CREATE INDEX "gpa_history_student_id_idx" ON "gpa_history"("student_id");

-- CreateIndex
CREATE INDEX "gpa_history_semester_id_idx" ON "gpa_history"("semester_id");

-- CreateIndex
CREATE UNIQUE INDEX "gpa_history_student_id_semester_id_key" ON "gpa_history"("student_id", "semester_id");

-- CreateIndex
CREATE INDEX "attendance_sessions_course_class_id_idx" ON "attendance_sessions"("course_class_id");

-- CreateIndex
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records"("session_id");

-- CreateIndex
CREATE INDEX "attendance_records_student_id_idx" ON "attendance_records"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_session_id_student_id_key" ON "attendance_records"("session_id", "student_id");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "chat_entities_message_id_idx" ON "chat_entities"("message_id");

-- CreateIndex
CREATE INDEX "chat_history_analysis_message_id_idx" ON "chat_history_analysis"("message_id");

-- CreateIndex
CREATE INDEX "chat_history_analysis_intent_id_idx" ON "chat_history_analysis"("intent_id");

-- CreateIndex
CREATE INDEX "system_response_templates_intent_id_idx" ON "system_response_templates"("intent_id");

-- CreateIndex
CREATE INDEX "workflow_mapping_intent_id_idx" ON "workflow_mapping"("intent_id");

-- CreateIndex
CREATE INDEX "ai_training_dataset_intent_id_idx" ON "ai_training_dataset"("intent_id");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_course_class_id_idx" ON "posts"("course_class_id");

-- CreateIndex
CREATE INDEX "posts_subject_id_idx" ON "posts"("subject_id");

-- CreateIndex
CREATE INDEX "post_media_post_id_idx" ON "post_media"("post_id");

-- CreateIndex
CREATE INDEX "post_interaction_post_id_idx" ON "post_interaction"("post_id");

-- CreateIndex
CREATE INDEX "post_interaction_user_id_idx" ON "post_interaction"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_interaction_post_id_user_id_type_key" ON "post_interaction"("post_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "conversations_user_id_1_idx" ON "conversations"("user_id_1");

-- CreateIndex
CREATE INDEX "conversations_user_id_2_idx" ON "conversations"("user_id_2");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_user_id_1_user_id_2_key" ON "conversations"("user_id_1", "user_id_2");

-- CreateIndex
CREATE INDEX "direct_messages_conversation_id_idx" ON "direct_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "direct_messages_sender_id_idx" ON "direct_messages"("sender_id");

-- CreateIndex
CREATE INDEX "service_requests_user_id_idx" ON "service_requests"("user_id");

-- CreateIndex
CREATE INDEX "service_requests_document_type_id_idx" ON "service_requests"("document_type_id");

-- CreateIndex
CREATE INDEX "warning_logs_user_id_idx" ON "warning_logs"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "tuition_fees_student_id_idx" ON "tuition_fees"("student_id");

-- CreateIndex
CREATE INDEX "tuition_fees_semester_id_idx" ON "tuition_fees"("semester_id");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_fees_student_id_semester_id_key" ON "tuition_fees"("student_id", "semester_id");

-- CreateIndex
CREATE UNIQUE INDEX "tuition_payments_transaction_id_key" ON "tuition_payments"("transaction_id");

-- CreateIndex
CREATE INDEX "tuition_payments_tuition_fee_id_idx" ON "tuition_payments"("tuition_fee_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturers" ADD CONSTRAINT "lecturers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_classes" ADD CONSTRAINT "course_classes_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_course_class_id_fkey" FOREIGN KEY ("course_class_id") REFERENCES "course_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_course_class_id_fkey" FOREIGN KEY ("course_class_id") REFERENCES "course_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "class_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gpa_history" ADD CONSTRAINT "gpa_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gpa_history" ADD CONSTRAINT "gpa_history_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_course_class_id_fkey" FOREIGN KEY ("course_class_id") REFERENCES "course_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_entities" ADD CONSTRAINT "chat_entities_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_history_analysis" ADD CONSTRAINT "chat_history_analysis_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_history_analysis" ADD CONSTRAINT "chat_history_analysis_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "chat_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_response_templates" ADD CONSTRAINT "system_response_templates_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "chat_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_mapping" ADD CONSTRAINT "workflow_mapping_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "chat_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_training_dataset" ADD CONSTRAINT "ai_training_dataset_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "chat_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_course_class_id_fkey" FOREIGN KEY ("course_class_id") REFERENCES "course_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_interaction" ADD CONSTRAINT "post_interaction_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_interaction" ADD CONSTRAINT "post_interaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_1_fkey" FOREIGN KEY ("user_id_1") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_2_fkey" FOREIGN KEY ("user_id_2") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warning_logs" ADD CONSTRAINT "warning_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_fees" ADD CONSTRAINT "tuition_fees_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_fees" ADD CONSTRAINT "tuition_fees_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuition_payments" ADD CONSTRAINT "tuition_payments_tuition_fee_id_fkey" FOREIGN KEY ("tuition_fee_id") REFERENCES "tuition_fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
