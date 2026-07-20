const fs = require('fs');

let code = fs.readFileSync('src/components/VideoInfo.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";',
  'import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";\nimport ShareModal from "@/components/ShareModal";\nimport SaveToPlaylistModal from "@/components/SaveToPlaylistModal";'
);

// 2. Remove Playlist state
code = code.replace(
  '  const [playlistsLoading, setPlaylistsLoading] = useState(false);\n  const [playlists, setPlaylists] = useState<Array<any>>([]);\n  const [playlistBusyId, setPlaylistBusyId] = useState<string | null>(null);',
  ''
);

// 3. Remove Share state and logic
code = code.replace(
  /  const \[shareUrl, setShareUrl\] = useState\(""\);[\s\S]*?const shareWasOpenRef = useRef\(false\);/,
  '  const [shareUrl, setShareUrl] = useState("");'
);

// 4. Remove Playlist Logic functions
code = code.replace(
  /  const isVideoInPlaylist = \([\s\S]*?finally \{\n      setPlaylistBusyId\(null\);\n    \}\n  \};/,
  ''
);

// 5. Remove Share Effect (startAtTime logic)
code = code.replace(
  /  useEffect\(\(\) => \{\n    if \(\!shareOpen\) \{[\s\S]*?\}, \[shareOpen, currentTimeSeconds\]\);/,
  ''
);

// 6. Remove Share Functions
code = code.replace(
  /  const buildShareUrl = \([\s\S]*?notify\.error\("Could not copy embed code"\);\n    \}\n  \};/,
  ''
);

// 7. Replace JSX modals
// Replace Save to Playlist JSX
code = code.replace(
  /          <Dialog\n            open=\{saveOpen\}\n            onOpenChange=\{\(open\) => \{[\s\S]*?<\/DialogContent>\n          <\/Dialog>/,
  '          <Button variant="ghost" size="sm" className="rounded-full bg-muted" onClick={() => setSaveOpen(true)}>\n            <ListPlus className="w-5 h-5 mr-2" />\n            Save\n          </Button>\n          <SaveToPlaylistModal open={saveOpen} onOpenChange={setSaveOpen} videoId={String(video?._id || "")} />'
);

// Replace Share JSX
code = code.replace(
  /          <Dialog open=\{shareOpen\} onOpenChange=\{setShareOpen\}>[\s\S]*?<\/DialogContent>\n          <\/Dialog>/,
  '          <Button variant="ghost" size="sm" className="rounded-full bg-muted" onClick={() => setShareOpen(true)}>\n            <Share className="w-5 h-5 mr-2" />\n            Share\n          </Button>\n          <ShareModal open={shareOpen} onOpenChange={setShareOpen} videoUrl={shareUrl} videoTitle={video?.videotitle || ""} currentTimeSeconds={currentTimeSeconds} />'
);

fs.writeFileSync('src/components/VideoInfo.tsx', code);
console.log('VideoInfo.tsx refactored');
