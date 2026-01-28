---
layout: default
title: parkrun Userscripts - Enhance your parkrun experience
redirect_from:
  - /scripts/
og_image: /tampermonkey-parkrun/images/alphabet-challenge.png
lcp_preload: true
description: A collection of userscripts that enhance parkrun pages with additional statistics, visualisations, and challenges for parkrun participants.
keywords: parkrun, userscript, userscripts, tampermonkey, parkrun statistics, parkrun analysis, parkrun challenges, parkrun visualisations, parkrun charts, parkrun bingo, parkrun alphabet challenge, parkrun compass, parkrun data analysis
---

## What

A collection of userscripts that enhance parkrun pages with additional statistics, visualisations, and challenges. These scripts work with parkrun event pages, parkrunner profile pages, and results pages, and can be used with any userscript manager including [Userscripts][userscripts], [Tampermonkey][tampermonkey], [Violentmonkey][violentmonkey], or any compatible browser extension.

## Why

I wrote these scripts while participating in and volunteering at parkrun, to make it easier to track personal achievements and understand event statistics. The scripts provide:

- Visual representations of parkrun data
- Tracking for unofficial challenges (alphabet, compass, bingo)
- Analysis tools for walkers and community statistics
- Enhanced event history and finisher data visualisations

## Installation

1. **Install a userscript manager for your browser:**
   - **Desktop:** [Userscripts][userscripts] (Safari), [Tampermonkey][tampermonkey] (Chrome, Firefox, Edge, Opera), or [Violentmonkey][violentmonkey] ([Orion][orion])
   - **iOS:** [Userscripts][userscripts] (Safari) or [Violentmonkey][violentmonkey] ([Orion][orion])
   - **Android:** Install [Kiwi Browser][kiwi-browser], then install [Tampermonkey][tampermonkey-chrome] or [Violentmonkey][violentmonkey-chrome] from the Chrome Web Store

2. **Click on any of the script links below**

3. **Click "Install" when prompted**

## Available Scripts

{% assign scripts = site.data.scripts %}

<div class="scripts-grid">
{% for script in scripts %}
{% assign script_id = script.filename | replace: '.user.js', '' %}
<div class="script-item" id="{{ script_id }}">
<h3><a href="{{ site.baseurl }}/{{ script_id }}/">{{ script.name }}</a></h3>
<p>{{ script.description }}</p>
<a href="{{ site.url }}{{ script.screenshot }}" class="screenshot-link" title="View full-size screenshot" target="_blank" rel="noopener">
<picture>
  <source type="image/webp" srcset="{{ script.screenshot_webp }}">
  <img src="{{ script.screenshot }}" alt="{{ script.name }} Screenshot" width="{{ script.screenshot_width }}" height="{{ script.screenshot_height }}" style="aspect-ratio: {{ script.screenshot_width }} / {{ script.screenshot_height }};" loading="{% if forloop.first %}eager{% else %}lazy{% endif %}" {% if forloop.first %}fetchpriority="high"{% endif %}>
</picture>
</a>
<a href="{{ script.install_url }}">Install {{ script.name }}</a>
</div>
{% endfor %}
</div>

[userscripts]: https://github.com/quoid/userscripts
[tampermonkey]: https://www.tampermonkey.net/
[violentmonkey]: https://violentmonkey.github.io/
[orion]: https://orionbrowser.com
[kiwi-browser]: https://play.google.com/store/apps/details?id=com.kiwibrowser.browser
[tampermonkey-chrome]: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
[violentmonkey-chrome]: https://chrome.google.com/webstore/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag
