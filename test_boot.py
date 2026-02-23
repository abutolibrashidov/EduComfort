import sys
import traceback

try:
    print("Testing import of app.main...")
    import app.main
    print("Import successful!")
except BaseException as e:
    print("Crash caught:")
    traceback.print_exc()
