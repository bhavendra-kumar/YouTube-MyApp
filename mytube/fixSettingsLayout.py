import re

with open('src/pages/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken `return (` section.
# I'll locate `return (`
start_idx = content.find('return (')

new_return = """return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <h1 className="text-2xl font-bold mb-6 px-3">Settings</h1>
          <nav className="flex flex-col gap-1">
            <Button
              variant={activeTab === "account" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("account")}
            >
              Account & Downloads
            </Button>
            <Button
              variant={activeTab === "channel" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("channel")}
            >
              Channel Profile
            </Button>
            <Button
              variant={activeTab === "appearance" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("appearance")}
            >
              Appearance
            </Button>
            <Button
              variant={activeTab === "preferences" ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setActiveTab("preferences")}
            >
              Preferences
            </Button>
          </nav>
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === "account" && (
            <>
"""

content = content[:start_idx] + new_return + content[start_idx + len('return ('):]

# Now let's fix the sections wrapping.
# 1. Close the Account tab and start Channel tab before `<section className="rounded-lg border bg-card p-4">\n          <h2 className="text-lg font-medium">Channel</h2>`
channel_start = content.find('<h2 className="text-lg font-medium">Channel</h2>')
channel_section = content.rfind('<section', 0, channel_start)
content = content[:channel_section] + '            </>\n          )}\n          {activeTab === "channel" && (\n            ' + content[channel_section:]

# 2. Appearance tab
app_start = content.find('<h2 className="text-lg font-medium">Appearance</h2>')
app_section = content.rfind('<section', 0, app_start)
content = content[:app_section] + '          )}\n          {activeTab === "appearance" && (\n            ' + content[app_section:]

# 3. Preferences tab
pref_start = content.find('<h2 className="text-lg font-medium">Preferences</h2>')
pref_section = content.rfind('<section', 0, pref_start)
content = content[:pref_section] + '          )}\n          {activeTab === "preferences" && (\n            ' + content[pref_section:]

# 4. Remove the trailing `)}</div></div></main>` that was left over or added.
# Wait, I previously added `          )}\n        </div>\n      </div>\n    </main>` via the multi_replace tool.
# Let's just strip everything after the Preferences `</section>` and add it cleanly.
pref_end = content.find('</section>', pref_section) + len('</section>')
clean_end = "\n          )}\n        </div>\n      </div>\n    </main>\n  );\n}\n\nSettingsPage.requireAuth = true;\n"

content = content[:pref_end] + clean_end

with open('src/pages/settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed settings JSX")
