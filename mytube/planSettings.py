import re

with open('src/pages/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add activeTab state
if 'const [activeTab, setActiveTab]' not in content:
    content = content.replace('const [editChannelOpen, setEditChannelOpen] = useState(false);',
                              'const [editChannelOpen, setEditChannelOpen] = useState(false);\n  const [activeTab, setActiveTab] = useState<"account" | "channel" | "appearance" | "preferences">("account");')

# Let's completely replace the return statement and render the sections based on activeTab.
# Using a python script for this is prone to breaking JSX. Let's write a targeted script to extract sections or just write a simpler multi_replace.
