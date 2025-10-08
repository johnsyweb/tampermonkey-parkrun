#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dateToday = new Date().toISOString().split('T')[0];

const updateVersion = (filePath) => {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  // Match the whole version string (date and optional time, possibly with extra times)
  const versionRegex = /(@version\s+)(\d{4}-\d{2}-\d{2}(?: [0-9: ]+)*)/;
  const match = fileContent.match(versionRegex);

  if (!match) {
    console.error(`No @version found in ${filePath}`);
    return;
  }

  const prefix = match[1];
  const currentVersion = match[2];

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const newVersion = `${dateToday} ${hours}:${minutes}`;

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
