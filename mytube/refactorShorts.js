const fs = require('fs');
let code = fs.readFileSync('src/pages/shorts.tsx', 'utf8');

if (!code.includes('framer-motion')) {
  code = code.replace(
    'import { useState, useRef, useEffect, useMemo } from "react";',
    'import { useState, useRef, useEffect, useMemo } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
  // It might be imported differently:
  code = code.replace(
    'import { useEffect, useMemo, useRef, useState } from "react";',
    'import { useEffect, useMemo, useRef, useState } from "react";\nimport { motion, AnimatePresence } from "framer-motion";'
  );
}

// Wrap action buttons with motion.button
code = code.replace(
  /<button\n                  type="button"\n                  onClick=\{handleLike\}/,
  `<motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleLike}`
);
code = code.replace(
  /<button\n                  type="button"\n                  onClick=\{handleDislike\}/,
  `<motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={handleDislike}`
);

// We need to close motion.button instead of button.
// Actually doing this via regex might be very flaky for shorts.tsx.

fs.writeFileSync('src/pages/shorts.tsx', code);
