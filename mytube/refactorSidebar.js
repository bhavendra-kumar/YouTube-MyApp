const fs = require('fs');

let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// 1. Add import
if (!code.includes('framer-motion')) {
  code = code.replace(
    'import React from "react";',
    'import React from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}

// 2. Animate SidebarItem label
code = code.replace(
  /      \{\!isCollapsed && \(\n        <span className="truncate text-sm">\{label\}<\/span>\n      \)\}/,
  `      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="truncate text-sm overflow-hidden whitespace-nowrap ml-2"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>`
);

// 3. Update the aside element for desktop sidebar
code = code.replace(
  /<aside\n        className=\{cn\(\n          "hidden md:flex flex-col bg-background border-r shrink-0 transition-all duration-300",\n          isCollapsed \? "w-\[72px\]" : "w-64"\n        \)\}\n      >/,
  `<motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col bg-background border-r shrink-0 overflow-hidden"
      >`
);
code = code.replace(/<\/aside>/, `</motion.aside>`);

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('Sidebar animated');
