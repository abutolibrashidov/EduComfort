$unitsPath = "C:\Users\KSM\Desktop\Tests\Elementary test"

for ($i = 1; $i -le 9; $i++) {
    $unitFolder = Join-Path $unitsPath "UNIT $i"
    
    if (Test-Path $unitFolder) {
        Write-Host "Processing UNIT $i..."
        
        # Move SET 1 files
        $set1Path = Join-Path $unitFolder "SET 1"
        if (Test-Path $set1Path) {
            Get-ChildItem "$set1Path\*.json" | Move-Item -Destination $unitFolder -Force
            Write-Host "  Moved SET 1 files"
        }
        
        # Move SET 2 files
        $set2Path = Join-Path $unitFolder "SET 2"
        if (Test-Path $set2Path) {
            Get-ChildItem "$set2Path\*.json" | Move-Item -Destination $unitFolder -Force
            Write-Host "  Moved SET 2 files"
        }
    }
}

Write-Host "`nDone! All files moved to UNIT folders."