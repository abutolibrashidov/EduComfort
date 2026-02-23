import os

def rename_files():
    # Common issue: windows explorer hiding extensions or files uploaded without them
    root_dir = r"c:\Users\KSM\Desktop\Tests"
    print(f"Scanning {root_dir} for files to rename...")
    
    count = 0
    for root, dirs, files in os.walk(root_dir):
        for f in files:
            # Skip known extensions and hidden files
            if f.endswith('.json') or f.endswith('.py') or f.endswith('.md') or f.startswith('.') or 'package' in f or 'Link to' in f:
                continue
            
            full_path = os.path.join(root, f)
            try:
                # Check if it looks like JSON
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as check_file:
                    start = check_file.read(10).strip()
                    if start.startswith('{'):
                        new_path = full_path + ".json"
                        if not os.path.exists(new_path):
                            print(f"Renaming: {f} -> {f}.json")
                            os.rename(full_path, new_path)
                            count += 1
                        else:
                            print(f"Skipping {f}, .json version already exists.")
            except Exception as e:
                print(f"Error checking {f}: {e}")

    print(f"Renamed {count} files.")

if __name__ == "__main__":
    rename_files()
