---
layout: default
title: parkrun Userscripts - Enhance your parkrun experience
description: A collection of userscripts that enhance parkrun pages with additional statistics, visualisations, and challenges for parkrun participants.
keywords: parkrun, userscript, userscripts, tampermonkey, parkrun statistics, parkrun analysis, parkrun challenges, parkrun visualisations, parkrun charts, parkrun bingo, parkrun alphabet challenge, parkrun compass, parkrun data analysis
---

## What

A collection of userscripts that enhance parkrun pages with additional statistics, visualisations, and challenges. These scripts work with parkrun event pages, parkrunner profile pages, and results pages, and can be used with any userscript manager including [Userscripts](https://github.com/quoid/userscripts), [Tampermonkey](https://www.tampermonkey.net/), or any compatible browser extension.

## Why

I wrote these scripts while participating in and volunteering at parkrun, to make it easier to track personal achievements and understand event statistics. The scripts provide:

- Visual representations of parkrun data
- Tracking for unofficial challenges (alphabet, compass, bingo)
- Analysis tools for walkers and community statistics
- Enhanced event history and finisher data visualisations

## Installation

Each script can be installed directly via any userscript manager:

1. Install a userscript manager for your browser:
   - [Userscripts](https://github.com/quoid/userscripts) (for Safari, macOS/iOS)
   - [Tampermonkey](https://www.tampermonkey.net/) (for Chrome, Firefox, Edge, Opera)
   - Or any compatible userscript manager
2. Click on any of the script links below
3. Click "Install" when prompted

## Available Scripts

{% assign scripts = site.data.scripts %}
<div class="scripts-grid">
{% for script in scripts %}
<div class="script-item">
<h3>{{ script.name }}</h3>
<p>{{ script.description }}</p>
<img src="{{ script.screenshot }}" alt="{{ script.name }} Screenshot">
<a href="{{ script.install_url }}">Install</a>
</div>
{% endfor %}
</div>

