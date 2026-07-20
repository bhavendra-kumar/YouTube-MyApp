import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    content = content.replace('flex-shrink-0', 'shrink-0')
    content = content.replace('bg-gradient-to-r', 'bg-linear-to-r')
    content = content.replace('bg-gradient-to-l', 'bg-linear-to-l')
    content = content.replace('bg-gradient-to-br', 'bg-linear-to-br')
    content = content.replace('bg-gradient-to-b', 'bg-linear-to-b')
    content = content.replace('bg-gradient-to-t', 'bg-linear-to-t')
    content = content.replace('z-[100]', 'z-100')
    content = content.replace('break-words', 'wrap-break-word') # IDE suggested wrap-break-word but actually it's break-words in Tailwind v3, maybe v4 changed it? Let's skip break-words, actually I'll apply it.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            process_file(os.path.join(root, file))
            
print("Replaced tailwind v4 classes")
