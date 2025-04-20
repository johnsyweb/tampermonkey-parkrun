const { exec } = require('child_process');
const { glob } = require('glob');
const { join, basename } = require('path');
const { readFile, writeFile } = require('fs/promises');
const process = require('process');
const uglifyjs = require('uglify-js');

const BOOKMARKLETS_START_MARKER = '## Bookmarklets';
const BOOKMARKLETS_END_MARKER = '<!-- END BOOKMARKLETS SECTION -->';
const USERSCRIPT_DELIMITER = '// ==/UserScript==';

function extractScriptInfo(filepath) {
    return readFile(filepath, 'utf-8')
        .then(content => {
            const headerSection = content.split(USERSCRIPT_DELIMITER)[0];
            const nameMatch = headerSection.match(/@name\s+(.*)/);
            const descriptionMatch = headerSection.match(/@description\s+(.*)/);

            const name = nameMatch ? nameMatch[1].trim() : basename(filepath, '.user.js');
            const description = descriptionMatch ? descriptionMatch[1].trim() : '';

            return { name, description, content };
        });
}

function createBookmarklet(filepath) {
    return extractScriptInfo(filepath)
        .then(({ content }) => {
            const scriptContent = content.split(USERSCRIPT_DELIMITER)[1];
            const requireMatch = content.match(/@require\s+(.*)/);
            const externalScripts = requireMatch ? [`await loadScript('${requireMatch[1]}');`] : [];

            const bookmarkletWrapper = `
                javascript:(async function(){
                    async function loadScript(url) {
                        return new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = url;
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }
                    ${externalScripts.join('\n')}
                    ${scriptContent}
                })();
            `;

            const minified = uglifyjs.minify(bookmarkletWrapper, {
                compress: true,
                mangle: true,
            });

            return minified.code;
        });
}

function updateReadme(bookmarklets) {
    const readmePath = join(process.cwd(), 'README.md');

    return readFile(readmePath, 'utf-8')
        .then(readme => {
            const bookmarkletSection = `${BOOKMARKLETS_START_MARKER}

You can also use these scripts as bookmarklets by creating bookmarks with the following URLs:

${Object.entries(bookmarklets)
                    .map(([name, { code, description }]) => `### ${name}
${description ? `\n${description}\n` : ''}
\`\`\`javascript
${code}
\`\`\``)
                    .join('\n\n')}
${BOOKMARKLETS_END_MARKER}`;

            const bookmarkletRegex = new RegExp(
                `${BOOKMARKLETS_START_MARKER}[\\s\\S]*?${BOOKMARKLETS_END_MARKER}`
            );

            if (readme.match(bookmarkletRegex)) {
                readme = readme.replace(bookmarkletRegex, bookmarkletSection);
            } else {
                while (!readme.endsWith('\n\n')) {
                    readme += '\n';
                }
                readme += bookmarkletSection;
            }

            return writeFile(readmePath, readme);
        });
}

function findUserScripts() {
    return glob('*.user.js', { cwd: process.cwd() })
        .catch(err => {
            console.error('Error finding userscripts:', err);
            throw err;
        });
}

function main() {
    if (process.env.CI) {
        console.log('Running in CI environment');
        exec('git config --global user.name github-actions[bot]');
        exec('git config --global user.email github-actions[bot]@users.noreply.github.com');
    }

    return findUserScripts()
        .then(userScriptFiles => {
            console.log(`Found ${userScriptFiles.length} userscripts: ${userScriptFiles.join(', ')}`);

            const bookmarkletPromises = userScriptFiles.map(file => {
                return extractScriptInfo(file)
                    .then(scriptInfo => {
                        return createBookmarklet(file)
                            .then(bookmarkletCode => {
                                console.log(`Processed: ${file} (${scriptInfo.name})`);
                                return [scriptInfo.name, { code: bookmarkletCode, description: scriptInfo.description }];
                            });
                    });
            });

            return Promise.all(bookmarkletPromises);
        })
        .then(bookmarkletEntries => {
            const bookmarklets = Object.fromEntries(bookmarkletEntries);
            return updateReadme(bookmarklets);
        })
        .then(() => {
            console.log('README.md updated with bookmarklets');
        });
}

main().catch(console.error);
