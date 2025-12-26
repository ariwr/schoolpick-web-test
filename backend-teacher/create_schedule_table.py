"""
Create schedule_metadata table
"""
from app.database import engine
from sqlalchemy import text

# Execute each statement separately
with engine.connect() as conn:
    # Create table
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS schedule_metadata (
            id SERIAL PRIMARY KEY,
            version_name VARCHAR(100) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        )
    """))
    
    # Create index
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_schedule_metadata_active 
        ON schedule_metadata(is_active)
    """))
    
    # Insert default record
    conn.execute(text("""
        INSERT INTO schedule_metadata (version_name, description, is_active, is_published)
        SELECT '2024-2학기 초안', '기본 시간표', TRUE, FALSE
        WHERE NOT EXISTS (SELECT 1 FROM schedule_metadata)
    """))
    
    conn.commit()
    print("✅ schedule_metadata table created successfully!")
