ALTER TABLE student_faces ALTER COLUMN embedding_vector TYPE vector(512) USING embedding_vector::vector;
