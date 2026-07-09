const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/quan-ly');
const files = [
  'booking.tsx', 'branches.tsx', 'forecast.tsx', 'marketing.tsx', 
  'menu.tsx', 'promo.tsx', 'purchase-orders.tsx', 'reports.tsx', 
  'shifts.tsx', 'stations.tsx', 'stock.tsx', 'suppliers.tsx', 
  'tables.tsx', 'users.tsx', 'index.tsx', 'audit.tsx', 'bi-reports.tsx',
  'customers.tsx', 'exec-dashboard.tsx', 'membership.tsx', 'menu-eng.tsx', 'recipes.tsx'
];

const hoverableDef = `const HoverableOpacity = ({ style, hoverStyle, ...props }: React.ComponentProps<typeof TouchableOpacity> & { hoverStyle?: any }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <TouchableOpacity
      {...props}
      {...({
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
      } as any)}
      style={[
        style,
        hovered && (hoverStyle || { opacity: 0.8 })
      ]}
    />
  );
};`;

for (const file of files) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    continue;
  }
  let code = fs.readFileSync(filePath, 'utf8');

  console.log(`Optimizing ${file}...`);

  // 1. React import & HoverableOpacity definition
  if (!code.includes('const HoverableOpacity')) {
    // Import React if missing
    if (code.includes("import { useCallback") && !code.includes("import React,")) {
      code = code.replace("import { useCallback", "import React, { useCallback");
    } else if (code.includes("import { useEffect") && !code.includes("import React,")) {
      code = code.replace("import { useEffect", "import React, { useEffect");
    } else if (code.includes("import { useState") && !code.includes("import React,")) {
      code = code.replace("import { useState", "import React, { useState");
    } else if (!code.includes("import React") && !code.includes("import React,")) {
      const lines = code.split('\n');
      lines.splice(1, 0, "import React from 'react';");
      code = lines.join('\n');
    }

    // Place HoverableOpacity definition after imports
    const importMatches = [...code.matchAll(/import\s+[\s\S]*?from\s+['"].*?['"];?/g)];
    let insertIndex = -1;
    if (importMatches.length > 0) {
      const lastMatch = importMatches[importMatches.length - 1];
      insertIndex = lastMatch.index + lastMatch[0].length;
    }
    if (insertIndex !== -1) {
      code = code.slice(0, insertIndex) + '\n\n' + hoverableDef + '\n' + code.slice(insertIndex);
    }
  }

  // 2. Bolding adjustments in style definitions
  // statValue: remove fontWeight: '900' override
  code = code.replace(/(statValue:\s*\{[^}]+?)fontWeight:\s*'900',?\s*/g, '$1');
  
  // panelStatValue, detailValue, kpiValue, panelValue: change to '700'
  code = code.replace(/(panelStatValue:\s*\{[^}]+?fontWeight:\s*)'900'/g, "$1'700'");
  code = code.replace(/(detailValue:\s*\{[^}]+?fontWeight:\s*)'900'/g, "$1'700'");
  code = code.replace(/(panelValue:\s*\{[^}]+?fontWeight:\s*)'900'/g, "$1'700'");
  code = code.replace(/(kpiValue:\s*\{[^}]+?fontWeight:\s*)'900'/g, "$1'700'");

  // 3. Touch Targets (Styles)
  // refreshBtn / addBtn / headerBtn: width/height 36 or 38 -> 44
  code = code.replace(/(refreshBtn:\s*\{[^}]+?height:\s*)(36|38)/g, "$144");
  code = code.replace(/(refreshBtn:\s*\{[^}]+?width:\s*)(36|38)/g, "$144");
  code = code.replace(/(addBtn:\s*\{[^}]+?height:\s*)(36|38)/g, "$144");
  code = code.replace(/(addBtn:\s*\{[^}]+?width:\s*)(36|38)/g, "$144");
  code = code.replace(/(headerBtn:\s*\{[^}]+?height:\s*)(36|38)/g, "$144");
  code = code.replace(/(headerBtn:\s*\{[^}]+?width:\s*)(36|38)/g, "$144");
  
  // tr/tableRow: paddingVertical 10 -> paddingVertical 13
  code = code.replace(/(tr:\s*\{[^}]+?paddingVertical:\s*)10/g, "$113");
  code = code.replace(/(tableRow:\s*\{[^}]+?paddingVertical:\s*)10/g, "$113");
  
  // filter chip/tabs: paddingVertical 5 to 7 -> minHeight 44, justifyContent: 'center'
  code = code.replace(/(chip:\s*\{[^}]+?)paddingVertical:\s*[567],?/g, "$1minHeight: 44, justifyContent: 'center',");
  
  // area chips, capacity buttons (currently width 44, height 40) -> change to width 44, height 44
  code = code.replace(/width:\s*44,\s*height:\s*40/g, "width: 44, height: 44");

  // progress bar border-radiuses from 3px to 4 in bi-reports, customers, menu-eng
  if (file === 'bi-reports.tsx' || file === 'customers.tsx' || file === 'menu-eng.tsx') {
    code = code.replace(/borderRadius:\s*3\b/g, 'borderRadius: 4');
  }

  // 4. Touchables replacement in JSX
  // Temporarily replace react-native import of TouchableOpacity to protect it
  const rnimpregex = /import\s+([\s\S]*?)\bTouchableOpacity\b([\s\S]*?)\s+from\s+'react-native';?/g;
  code = code.replace(rnimpregex, "import $1__TOUCHABLE_OPACITY_IMPORT__$2 from 'react-native';");

  // Now replace all other TouchableOpacity occurrences
  let newCode = '';
  let index = 0;
  while (index < code.length) {
    let nextTouch = code.indexOf('TouchableOpacity', index);
    if (nextTouch === -1) {
      newCode += code.slice(index);
      break;
    }
    
    // Check if it is inside the HoverableOpacity component definition itself
    let isInsideHoverableDef = false;
    const hoverableStart = code.indexOf('const HoverableOpacity');
    if (hoverableStart !== -1 && nextTouch > hoverableStart && nextTouch < hoverableStart + 450) {
      isInsideHoverableDef = true;
    }

    if (isInsideHoverableDef) {
      newCode += code.slice(index, nextTouch + 'TouchableOpacity'.length);
      index = nextTouch + 'TouchableOpacity'.length;
    } else {
      newCode += code.slice(index, nextTouch) + 'HoverableOpacity';
      index = nextTouch + 'TouchableOpacity'.length;
    }
  }
  
  code = newCode;

  // Restore the react-native import
  code = code.replace(/__TOUCHABLE_OPACITY_IMPORT__/g, 'TouchableOpacity');

  // Let's write the file back
  fs.writeFileSync(filePath, code, 'utf8');
}

console.log('Optimization script completed successfully!');
