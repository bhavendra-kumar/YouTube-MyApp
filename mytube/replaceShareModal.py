import sys

with open('src/components/VideoInfo.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# find index of `<Dialog open={shareOpen} onOpenChange={setShareOpen}>`
start_idx = -1
for i, line in enumerate(lines):
    if "<Dialog open={shareOpen} onOpenChange={setShareOpen}>" in line:
        start_idx = i
        break

if start_idx != -1:
    end_idx = -1
    for i in range(start_idx, len(lines)):
        if "          </Dialog>" in lines[i]:
            # Just to be safe that we match the right dialog
            # Wait, there might be multiple </Dialog>
            pass
            
    # Better to just use regex to replace the whole block
    pass

with open('src/components/VideoInfo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
# Find <Dialog open={shareOpen} onOpenChange={setShareOpen}> ... </Dialog>
pattern = r"<Dialog open=\{shareOpen\} onOpenChange=\{setShareOpen\}>.*?</Dialog>"
replacement = """<ShareModal
            isOpen={shareOpen}
            onOpenChange={setShareOpen}
            videoId={video._id}
            videoTitle={video.videotitle}
            currentTimeSeconds={currentTimeSeconds}
          />"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/components/VideoInfo.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replaced old share modal JSX")
