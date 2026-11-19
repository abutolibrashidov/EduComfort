import sqlite3
import sys

def migrate():
    try:
        print("Connecting to learning_center_migrated.db...")
        conn = sqlite3.connect('learning_center_migrated.db')
        columns = [info[1] for info in conn.execute('PRAGMA table_info(users)').fetchall()]
        print("Existing columns:", columns)
        
        queries = []
        if 'parent_name' not in columns: queries.append('ALTER TABLE users ADD COLUMN parent_name VARCHAR(100)')
        if 'address' not in columns: queries.append('ALTER TABLE users ADD COLUMN address VARCHAR(255)')
        if 'bio' not in columns: queries.append('ALTER TABLE users ADD COLUMN bio VARCHAR(500)')
        if 'employee_id' not in columns: queries.append('ALTER TABLE users ADD COLUMN employee_id VARCHAR(50)')
        if 'department' not in columns: queries.append('ALTER TABLE users ADD COLUMN department VARCHAR(100)')
        if 'status' not in columns: queries.append('ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT "active"')

        for q in queries:
            print(f'Executing: {q}')
            conn.execute(q)
            
        conn.commit()
        conn.close()
        print('Migration successful')
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)

if __name__ == '__main__':
    import shutil
    try:
        print("Copying learning_center.db to learning_center_migrated.db...")
        shutil.copy2('learning_center.db', 'learning_center_migrated.db')
        print("Copy success.")
    except Exception as e:
        print(f"Error copying DB: {e}")
    
    migrate()
