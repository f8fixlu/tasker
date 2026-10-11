const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to inline critical CSS
function inlineCriticalCSS() {
  try {
    // Read the built HTML file
    const indexPath = path.join(__dirname, 'build', 'index.html');
    if (!fs.existsSync(indexPath)) {
      console.log('Build directory does not exist. Run build first.');
      return;
    }
    
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Find all CSS links in the head
    const cssRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g;
    let match;
    const cssLinks = [];
    
    while ((match = cssRegex.exec(html)) !== null) {
      cssLinks.push(match[0]);
    }
    
    // Replace CSS links with preload + onload pattern
    cssLinks.forEach(linkTag => {
      const preloadLink = linkTag
        .replace(/<link/, '<link rel="preload" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"')
        .replace(/href=/, 'href=');
      
      html = html.replace(linkTag, preloadLink);
      
      // Add noscript fallback
      const noscriptFallback = `\n    <noscript>${linkTag}</noscript>`;
      html = html.replace('</head>', `    ${noscriptFallback}\n  </head>`);
    });
    
    // Write the modified HTML back
    fs.writeFileSync(indexPath, html);
    console.log('✅ Critical CSS inlined successfully');
  } catch (error) {
    console.error('❌ Error inlining critical CSS:', error);
  }
}

// Run the optimization
inlineCriticalCSS();
