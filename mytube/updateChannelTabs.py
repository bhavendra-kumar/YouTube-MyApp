import re

with open('src/pages/channel/[id]/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import ChannelCommunityTab' not in content:
    content = content.replace('import ChannelVideos from "@/components/ChannelVideos";',
                              'import ChannelVideos from "@/components/ChannelVideos";\nimport ChannelCommunityTab from "@/components/ChannelCommunityTab";\nimport ChannelAboutTab from "@/components/ChannelAboutTab";')

# We need to replace the inline About tab and Community tab.
# Let's find the start of About tab: activeTab === "about" ? (
about_start = content.find('activeTab === "about" ? (')
about_end = content.find(') : activeTab === "playlists" || activeTab === "community" ? (', about_start)
if about_start != -1 and about_end != -1:
    content = content[:about_start] + 'activeTab === "about" ? (\n            <ChannelAboutTab channel={channel} />\n          ' + content[about_end:]

# Let's find the community tab rendering.
# It is inside `) : (` of the `activeTab === "playlists" ? (...) : (...)` block.
# I will use a regex to replace the community div.
# Searching for: <div className="rounded-lg border bg-card p-4 text-card-foreground">\s*<h2 className="text-xl font-semibold">Community</h2>
community_start = content.find('<h2 className="text-xl font-semibold">Community</h2>')
if community_start != -1:
    div_start = content.rfind('<div', 0, community_start)
    # We need to replace until the end of the Community div. This is tricky with string finding.
    pass

with open('src/pages/channel/[id]/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
