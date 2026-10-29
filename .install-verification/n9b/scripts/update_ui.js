const fs = require('fs');
let content = fs.readFileSync('sca-studio/src/app/page.tsx', 'utf8');

// 1. Add states
content = content.replace("const [activeWorkspace, setActiveWorkspace] = React.useState<string>('');", 
  "const [activeWorkspace, setActiveWorkspace] = React.useState<string>('');\n  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = React.useState(true);\n  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);"
);

// 2. Add Left Toggle Button
content = content.replace(
  '<h1 className="text-xl font-bold text-white tracking-wide">🌌 SCA Studio</h1>',
  '<button onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} className="text-gray-400 hover:text-white focus:outline-none" title="Toggle Knowledge Base"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button><h1 className="text-xl font-bold text-white tracking-wide">🌌 SCA Studio</h1>'
);

// 3. Add Right Toggle Button
content = content.replace(
  '</button>\n          </div>\n        </header>',
  '</button>\n          <button onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} className="ml-4 text-gray-400 hover:text-white focus:outline-none" title="Toggle MCP Manager"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>\n          </div>\n        </header>'
);

// 4. Wrap Left Sidebar
content = content.replace(
  '<aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10 print:hidden">',
  '{isLeftSidebarOpen && (<aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-10 print:hidden transition-all duration-300">'
);
content = content.replace(
  '</aside>\n\n        {/* CENTER PANEL */}',
  '</aside>\n        )}\n\n        {/* CENTER PANEL */}'
);

// 5. Wrap Right Sidebar
content = content.replace(
  '<aside className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col z-10 print:hidden">',
  '{isRightSidebarOpen && (<aside className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col z-10 print:hidden transition-all duration-300">'
);
content = content.replace(
  '</aside>\n\n      </div>\n\n      {/* FILE VIEWER MODAL */}',
  '</aside>\n        )}\n\n      </div>\n\n      {/* FILE VIEWER MODAL */}'
);

fs.writeFileSync('sca-studio/src/app/page.tsx', content);
console.log('done');
