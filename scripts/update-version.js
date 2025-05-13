#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dateToday = new Date().toISOString().split('T')[0];

const updateVersion = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const versionRegex = /(@version\s+)(\S+)/;
  const match = fileContent.match(versionRegex);

  if (!match) {
    console.error(`No @version found in ${filePath}`);
    return;
  }

  const prefix = match[1]; // Preserve the prefix including whitespace
  const currentVersion = match[2];
  let newVersion = dateToday;

  if (currentVersion.startsWith(dateToday)) {
    const timeMatch = currentVersion.match(/\d{4}-\d{2}-\d{2} (\d{2}:\d{2}(?::\d{2})?)/);
    if (timeMatch) {
      const time = timeMatch[1];
      const seconds = new Date().getSeconds().toString().padStart(2, '0');
      newVersion = `${dateToday} ${time}:${seconds}`;
    } else {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      newVersion = `${dateToday} ${hours}:${minutes}`;
    }
  }

  console.log(`Updating ${filePath} from '${currentVersion}' to '${newVersion}'`);
  const updatedContent = fileContent.replace(versionRegex, `${prefix}${newVersion}`);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
};

const userScriptFiles = fs
  .readdirSync(require('process').cwd())
  .filter((file) => file.endsWith('.user.js'));

userScriptFiles.forEach((file) => {
  const filePath = path.join(require('process').cwd(), file);
  updateVersion(filePath);
});
