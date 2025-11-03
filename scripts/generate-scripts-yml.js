const fs = require('fs');
const data = JSON.parse(fs.readFileSync('docs/_data/scripts.json', 'utf8'));

const yaml = data
  .map((s) => {
    // Escape quotes in description for YAML
    const escapedDesc = s.description.replace(/"/g, '\\"');
    return `- name: ${s.name}
  description: "${escapedDesc}"
  screenshot: ${s.screenshot}
  install_url: ${s.install_url}
  filename: ${s.filename}
`;
  })
  .join('\n');

fs.writeFileSync('docs/_data/scripts.yml', yaml);
console.log('✅ Generated docs/_data/scripts.yml');
