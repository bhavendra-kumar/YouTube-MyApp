import re

with open('src/pages/shorts.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add framer-motion import
if 'import { motion }' not in content:
    content = re.sub(
        r'(import .*? from "react";)',
        r'\1\nimport { motion } from "framer-motion";',
        content,
        count=1
    )

# The specific action rail block starts with: {/* Action Rail */}
# We can replace all `<button aria-label="...` and `</button>` inside that block.
# Actually, the action rail block can just be targeted.

action_rail_start = content.find('{/* Action Rail */}')
if action_rail_start != -1:
    action_rail_end = content.find('</section>', action_rail_start)
    if action_rail_end != -1:
        action_rail_block = content[action_rail_start:action_rail_end]
        
        # Replace buttons
        new_action_rail_block = re.sub(
            r'<button aria-label="([^"]+)"([^>]+)>',
            r'<motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} aria-label="\1"\2>',
            action_rail_block
        )
        new_action_rail_block = new_action_rail_block.replace('</button>', '</motion.button>')
        
        content = content[:action_rail_start] + new_action_rail_block + content[action_rail_end:]
        
        with open('src/pages/shorts.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully enhanced Shorts action rail with framer-motion.")
    else:
        print("Could not find end of action rail section.")
else:
    print("Could not find action rail section.")
