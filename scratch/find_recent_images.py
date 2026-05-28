import os
import glob

files = []
for ext in ('**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.webp'):
    for path in glob.glob(ext, recursive=True):
        if os.path.isfile(path) and "node_modules" not in path and ".git" not in path:
            files.append((path, os.path.getmtime(path)))

files.sort(key=lambda x: x[1], reverse=True)
print("Top 10 most recent images:")
for f, t in files[:10]:
    import datetime
    dt = datetime.datetime.fromtimestamp(t)
    print(f, "Last Modified:", dt, "Size:", os.path.getsize(f))
