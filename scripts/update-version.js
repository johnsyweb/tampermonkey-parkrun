#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const execSync = require('child_process').execSync;
const process = require('process');

const ROOT_DIR = process.cwd();

// Safety guard: only allow this to run in CI environments.
// This script mutates version headers across all .user.js files
// and should not be invoked manually in local development.
const isCI =
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.GITHUB_ACTION === 'true';

if (!isCI) {
  console.error(
    '❌ scripts/update-version.js is intended to run only in CI (CI/GITHUB_ACTIONS=true).'
  );
  process.exit(1);
}

function getCurrentVersion(fileContent) {
  // Match @version x.y.z
  const versionRegex = /@version\s+(\d+)\.(\d+)\.(\d+)/;
  const match = fileContent.match(versionRegex);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      str: `${match[1]}.${match[2]}.${match[3]}`,
    };
  }
  return { major: 1, minor: 0, patch: 0, str: '1.0.0' };
}

function getCommitsSinceVersion(version) {
  try {
    // Find the commit where this version was set
    const grep = execSync(`git log -G"@version\\s+${version}" --pretty=format:"%H" --reverse`)
      .toString()
      .trim();
    const versionCommit = grep.split('\n').pop();
    if (!versionCommit) return [];
    // Get all commit messages since that commit (exclusive)
    const log = execSync(`git log ${versionCommit}..HEAD --pretty=format:"%s"`).toString().trim();
    return log ? log.split('\n') : [];
  } catch {
    return [];
  }
}

function determineBump(commits) {
  let bump = 'patch';
  for (const msg of commits) {
    if (/^feat!|BREAKING CHANGE/.test(msg)) return 'major';
    if (/^feat(\(|:)/.test(msg)) bump = 'minor';
  }
  return bump;
}

function bumpVersion({ major, minor, patch }, bumpType) {
  if (bumpType === 'major') return { major: major + 1, minor: 0, patch: 0 };
  if (bumpType === 'minor') return { major, minor: minor + 1, patch: 0 };
  return { major, minor, patch: patch + 1 };
}

function applyVersionToFile(filePath, newVersion, label) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf8');
  const current = getCurrentVersion(fileContent);
  const versionRegex = /(@version\s+)(\d+\.\d+\.\d+|\d{4}-\d{2}-\d{2}(?: [0-9: ]+)*)/;
  const updatedContent = fileContent.replace(versionRegex, `$1${newVersion}`);
  if (current.str !== newVersion) {
    const targetLabel = label || filePath;
    console.log(`Updating ${targetLabel} from '${current.str}' to '${newVersion}'`);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
  } else {
    const targetLabel = label || filePath;
    console.log(`${targetLabel} already at version ${newVersion}`);
  }
}

function updateVersionForPair(rootUserScriptPath) {
  const fileContent = fs.readFileSync(rootUserScriptPath, 'utf8');
  const current = getCurrentVersion(fileContent);
  const commits = getCommitsSinceVersion(current.str);
  const bumpType = determineBump(commits);
  const next = bumpVersion(current, bumpType);
  const newVersion = `${next.major}.${next.minor}.${next.patch}`;

  // Update the generated root userscript (what browsers actually install)
  applyVersionToFile(rootUserScriptPath, newVersion);

  // Keep the corresponding source file in sync so future builds don't revert
  // the bumped version back to an older value.
  const srcUserScriptPath = path.join(ROOT_DIR, 'src', path.basename(rootUserScriptPath));
  applyVersionToFile(srcUserScriptPath, newVersion, `src/${path.basename(rootUserScriptPath)}`);
}

const userScriptFiles = fs.readdirSync(ROOT_DIR).filter((file) => file.endsWith('.user.js'));

userScriptFiles.forEach((file) => {
  const filePath = path.join(ROOT_DIR, file);
  updateVersionForPair(filePath);
});
