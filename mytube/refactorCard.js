const fs = require('fs');
let code = fs.readFileSync('src/components/VideoCard.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";\nimport axiosClient from "@/services/http/axios";',
  'import { requestVideoDownload, triggerBrowserDownload } from "@/services/downloads";\nimport axiosClient from "@/services/http/axios";\nimport ShareModal from "@/components/ShareModal";\nimport SaveToPlaylistModal from "@/components/SaveToPlaylistModal";'
);

// 2. Add State
code = code.replace(
  '  const [saved, setSaved] = useState(false);\n  const menuRef = useRef<HTMLDivElement>(null);',
  '  const [saved, setSaved] = useState(false);\n  const [shareModalOpen, setShareModalOpen] = useState(false);\n  const [savePlaylistOpen, setSavePlaylistOpen] = useState(false);\n  const menuRef = useRef<HTMLDivElement>(null);'
);

// 3. Update handleShare
code = code.replace(
  /  const handleShare = useCallback\(\(e: React\.MouseEvent\) => \{[\s\S]*?  \}, \[href, title\]\);/,
  `  const handleShare = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShareModalOpen(true);
    setMenuOpen(false);
  }, []);

  const handleSaveToPlaylist = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setSavePlaylistOpen(true);
    setMenuOpen(false);
  }, []);`
);

// 4. Modify JSX to add "Save to playlist" button and modals
code = code.replace(
  /                <button\n                  className="flex w-full items-center gap-3 px-4 py-2\.5 text-sm hover:bg-accent transition-colors"\n                  onClick=\{handleShare\}\n                >\n                  <Share2 className="h-4 w-4" \/>\n                  Share\n                <\/button>/,
  `                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  onClick={handleSaveToPlaylist}
                >
                  <ListPlus className="h-4 w-4" />
                  Save to playlist
                </button>`
);

code = code.replace(
  /    <\/div>\n  \);\n\}\n\nexport default memo\(VideoCard\);/,
  `      <ShareModal 
        open={shareModalOpen} 
        onOpenChange={setShareModalOpen} 
        videoUrl={typeof window !== "undefined" ? \`\${window.location.origin}\${href}\` : href} 
        videoTitle={title} 
      />
      {video?._id && (
        <SaveToPlaylistModal 
          open={savePlaylistOpen} 
          onOpenChange={setSavePlaylistOpen} 
          videoId={String(video._id)} 
        />
      )}
    </div>
  );
}

export default memo(VideoCard);`
);

fs.writeFileSync('src/components/VideoCard.tsx', code);
console.log('VideoCard refactored');
