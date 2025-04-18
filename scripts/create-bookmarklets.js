import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import * as uglifyjs from 'uglify-js';

async function createBookmarklet(filepath) {
    const content = await readFile(filepath, 'utf-8');

    // Extract the main script content (everything between the userscript markers)
    const scriptContent = content.split('// ==/UserScript==')[1];

    // Handle external dependencies
    const requireMatch = content.match(/@require\s+(.*)/);
    const externalScripts = requireMatch ? [`await loadScript('${requireMatch[1]}');`] : [];

    // Create the bookmarklet wrapper with dependency loading
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

    // Minify the code
    const minified = uglifyjs.minify(bookmarkletWrapper, {
        compress: true,
        mangle: true,
    });

    return minified.code;
}

async function updateReadme(bookmarklets) {
    const readmePath = join(process.cwd(), 'README.md');
    let readme = await readFile(readmePath, 'utf-8');

    const bookmarkletSection = `## Bookmarklets

You can also use these scripts as bookmarklets by creating bookmarks with the following URLs:

${Object.entries(bookmarklets)
            .map(([name, code]) => `### ${name}\n\n\`\`\`javascript\n${code}\n\`\`\``)
            .join('\n\n')}
`;

    // Replace existing bookmarklet section or append
    const bookmarkletRegex = /## Bookmarklets[\s\S]*?(?=##|$)/;
    if (readme.match(bookmarkletRegex)) {
        readme = readme.replace(bookmarkletRegex, bookmarkletSection);
    } else {
        readme += '\n\n' + bookmarkletSection;
    }

    await writeFile(readmePath, readme);
}

async function main() {
    if (process.env.CI) {
        console.log('Running in CI environment');
        await exec('git config --global user.name github-actions[bot]');
        await exec('git config --global user.email github-actions[bot]@users.noreply.github.com');
    }

    const scripts = {
        'Wilson Index': 'w-index.js',
        'p-index': 'p-index.js',
    };

    const bookmarklets = {};
    for (const [name, file] of Object.entries(scripts)) {
        bookmarklets[name] = await createBookmarklet(join(process.cwd(), file));
    }

    await updateReadme(bookmarklets);
}

main().catch(console.error);
