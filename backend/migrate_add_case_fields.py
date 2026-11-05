"""
Migration script to add active_cases and recoveries fields to published_outbreak_records table.
Run this once to update the schema.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "sdg3.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(published_outbreak_records)")
        columns = [row[1] for row in cursor.fetchall()]
        
        migrations_applied = []
        
        # Add active_cases if it doesn't exist
        if 'active_cases' not in columns:
            cursor.execute("""
                ALTER TABLE published_outbreak_records 
                ADD COLUMN active_cases INTEGER
            """)
            migrations_applied.append("Added active_cases column")
            print("✅ Added active_cases column")
        else:
            print("ℹ️  active_cases column already exists")
        
        # Add recoveries if it doesn't exist
        if 'recoveries' not in columns:
            cursor.execute("""
                ALTER TABLE published_outbreak_records 
                ADD COLUMN recoveries INTEGER
            """)
            migrations_applied.append("Added recoveries column")
            print("✅ Added recoveries column")
        else:
            print("ℹ️  recoveries column already exists")
        
        conn.commit()
        
        if migrations_applied:
            print(f"\n✅ Migration complete! Applied {len(migrations_applied)} change(s)")
        else:
            print("\n✅ No migration needed - schema is up to date")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(published_outbreak_records)")
        print("\nCurrent schema:")
        for row in cursor.fetchall():
            print(f"  {row[1]}: {row[2]}")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("Starting database migration...")
    print(f"Database: {DB_PATH}")
    migrate()
