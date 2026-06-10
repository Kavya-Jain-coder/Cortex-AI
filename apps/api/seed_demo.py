import asyncio
import os
from datetime import datetime, timedelta
import random
from uuid import uuid4

from dotenv import load_dotenv
from supabase import create_client, Client
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Load env
load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

from app.models.models import Subject, Note, StudySession, Assignment, Document

async def seed():
    print("Connecting to Supabase Admin API...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    email = "demo@cortex.ai"
    password = "password123"
    
    # Check if user exists or create
    print(f"Ensuring user {email} exists...")
    try:
        user_response = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user_id = user_response.user.id
        print(f"Created new user with ID: {user_id}")
    except Exception as e:
        print(f"User might already exist. Exception: {e}")
        # Connect to DB to find the user ID directly from auth.users
        import asyncpg
        conn = await asyncpg.connect(os.getenv("DATABASE_URL"))
        row = await conn.fetchrow("SELECT id FROM auth.users WHERE email = $1", email)
        await conn.close()
        
        if row:
            user_id = str(row['id'])
            print(f"Found existing user with ID: {user_id}")
        else:
            raise Exception("Failed to find or create demo user!")

    # Connect to DB
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("Creating Subjects...")
        s1_id, s2_id, s3_id = str(uuid4()), str(uuid4()), str(uuid4())
        
        subjects = [
            Subject(id=s1_id, user_id=user_id, name="Machine Learning", color="#FF5733"),
            Subject(id=s2_id, user_id=user_id, name="Calculus III", color="#3357FF"),
            Subject(id=s3_id, user_id=user_id, name="System Design", color="#33FF57"),
        ]
        
        # Avoid duplicate primary key errors if running multiple times by just skipping if they exist
        # But wait, IDs are randomly generated here so they won't conflict, 
        # however let's just clear previous demo data to be safe:
        # Actually it's easier to just insert.
        db.add_all(subjects)
        await db.flush()

        print("Creating Notes...")
        notes = [
            Note(
                id=str(uuid4()), user_id=user_id, subject_id=s1_id,
                title="Gradient Descent",
                content="# Gradient Descent\\n\\nGradient descent is a first-order iterative optimization algorithm...\\n\\n$$ J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_\\theta(x^{(i)}) - y^{(i)})^2 $$\\n",
                type="typed"
            ),
            Note(
                id=str(uuid4()), user_id=user_id, subject_id=s2_id,
                title="Partial Derivatives",
                content="Partial derivatives measure the rate of change of a function with respect to one variable, while keeping others constant.",
                type="typed"
            ),
            Note(
                id=str(uuid4()), user_id=user_id, subject_id=s3_id,
                title="Microservices vs Monolith",
                content="Monoliths are single deployable units. Microservices break down the app into independent services communicating over network.",
                type="typed"
            )
        ]
        for n in notes:
            db.add(n)

        print("Creating Assignments...")
        print("Skipping assignments to simplify...")

        print("Creating Study Sessions for Analytics...")
        # Scatter study sessions over the last 7 days
        now = datetime.utcnow()
        for i in range(7):
            day = now - timedelta(days=i)
            # 2 to 4 sessions per day
        now = datetime.utcnow()
        for i in range(7):
            day = now - timedelta(days=i)
            for _ in range(random.randint(2, 4)):
                act_type = random.choice(["notes", "canvas", "chat", "search", "review"])
                duration = random.randint(15, 60)
                sub_id = random.choice([s1_id, s2_id, s3_id])
                sid = str(uuid4())
                await db.execute(
                    text("INSERT INTO study_sessions (id, user_id, subject_id, duration_minutes, activity_type, created_at) VALUES (:id, :user, :sub, :dur, :act, :ca)"),
                    {"id": sid, "user": user_id, "sub": sub_id, "dur": duration, "act": act_type, "ca": day}
                )

        print("Creating Mock Documents...")
        docs = [
            Document(id=str(uuid4()), user_id=user_id, subject_id=s1_id, file_name="cs229-notes.pdf", storage_key="dummy/cs229.pdf", mime_type="application/pdf", size_bytes=10000, status="ready"),
            Document(id=str(uuid4()), user_id=user_id, subject_id=s2_id, file_name="calc_cheatsheet.pdf", storage_key="dummy/calc.pdf", mime_type="application/pdf", size_bytes=5000, status="ready"),
            Document(id=str(uuid4()), user_id=user_id, subject_id=s3_id, file_name="ddia_chapter_1.pdf", storage_key="dummy/ddia.pdf", mime_type="application/pdf", size_bytes=20000, status="ready")
        ]
        for d in docs:
            db.add(d)

        await db.commit()
        print("✅ Successfully seeded database for demo@cortex.ai!")
        print("Credentials:")
        print("Email: demo@cortex.ai")
        print("Password: password123")

if __name__ == "__main__":
    asyncio.run(seed())
