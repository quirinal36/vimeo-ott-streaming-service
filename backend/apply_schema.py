#!/usr/bin/env python3
"""
Supabase 데이터베이스 스키마 적용 스크립트
이 스크립트는 schema.sql 파일을 Supabase에 적용합니다.
"""

import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from supabase import create_client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

# Create admin client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Read schema file
schema_path = Path(__file__).parent.parent / "supabase" / "schema.sql"
print(f"Reading schema from: {schema_path}")

with open(schema_path, "r") as f:
    schema_sql = f.read()

# Split into individual statements (rough split)
# Note: This won't work for complex SQL with functions that contain semicolons
print("\nSchema loaded successfully!")
print(f"Total length: {len(schema_sql)} characters")

print("\n" + "="*50)
print("IMPORTANT: Supabase Python client cannot execute raw SQL.")
print("Please apply the schema manually:")
print("="*50)
print("\n1. Go to: https://supabase.com/dashboard")
print("2. Select your project: mtjlurhltgxdutqkijlg")
print("3. Go to 'SQL Editor' in the left sidebar")
print("4. Click 'New query'")
print(f"5. Copy and paste the contents of: {schema_path}")
print("6. Click 'Run' to execute the schema")
print("\nAlternatively, you can use the Supabase CLI:")
print("  supabase login")
print("  supabase link --project-ref mtjlurhltgxdutqkijlg")
print("  supabase db push")
