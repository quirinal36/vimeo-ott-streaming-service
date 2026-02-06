-- courses 테이블에 instructor_name 컬럼 추가
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name VARCHAR(255);
