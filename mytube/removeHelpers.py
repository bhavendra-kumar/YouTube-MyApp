import sys

with open('src/components/VideoInfo.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The error was on line 403, and parseStartAtSeconds starts on 367.
# Let's remove lines 367 to 465 inclusive (0-indexed 366 to 464).
del lines[366:465]

with open('src/components/VideoInfo.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Removed lines 367 to 465")
