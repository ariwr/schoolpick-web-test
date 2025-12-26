"""
Migrate schedule_metadata table to add missing columns
"""
from app.database import engine
from sqlalchemy import text

migrations = [
    # Add version_name column
    "ALTER TABLE schedule_metadata ADD COLUMN IF NOT EXISTS version_name VARCHAR(100) DEFAULT '기본 시간표'",
    
    # Add description column
    "ALTER TABLE schedule_metadata ADD COLUMN IF NOT EXISTS description TEXT",
    
    # Add is_active column
    "ALTER TABLE schedule_metadata ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE",
    
    # Add is_published column
    "ALTER TABLE schedule_metadata ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE",
    
    # Add updated_at column
    "ALTER TABLE schedule_metadata ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
    
    # Set version_name to NOT NULL after adding default values
    "UPDATE schedule_metadata SET version_name = '기본 시간표' WHERE version_name IS NULL",
    "ALTER TABLE schedule_metadata ALTER COLUMN version_name SET NOT NULL",
    
    # Create index on is_active
    "CREATE INDEX IF NOT EXISTS idx_schedule_metadata_active ON schedule_metadata(is_active)",
    
    # Set first record as active if none are active
    """
    UPDATE schedule_metadata 
    SET is_active = TRUE 
    WHERE id = (SELECT MIN(id) FROM schedule_metadata) 
    AND NOT EXISTS (SELECT 1 FROM schedule_metadata WHERE is_active = TRUE)
    """
]

with engine.connect() as conn:
    for i, migration in enumerate(migrations, 1):
        try:
            conn.execute(text(migration))
            print(f"✅ Migration {i}/{len(migrations)} completed")
        except Exception as e:
            print(f"⚠️  Migration {i} failed (might already exist): {e}")
    
    conn.commit()
    print("\n✅ All migrations completed!")
