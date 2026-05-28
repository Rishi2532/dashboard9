import os
import glob
import datetime

folder = r"C:\Users\13208\.gemini\antigravity-ide"
files = []
for root, dirs, filenames in os.walk(folder):
    for filename in filenames:
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            path = os.path.join(root, filename)
            files.append((path, os.path.getmtime(path)))

files.sort(key=lambda x: x[1], reverse=True)
print("Top 10 recent images in Gemini app data folder:")
for f, t in files[:10]:
    dt = datetime.datetime.fromtimestamp(t)
    print(f, "Last Modified:", dt, "Size:", os.path.getsize(f))
