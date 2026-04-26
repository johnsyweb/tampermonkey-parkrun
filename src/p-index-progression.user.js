// ==UserScript==
// @name         parkrun p-index progression
// @description  Charts p-index progression over finishes with next-step planning details for p-index challenge analysis.
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/p-index-progression.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/parkrunner/*/all/
// @match        *://www.parkrun.co.at/parkrunner/*/all/
// @match        *://www.parkrun.co.nl/parkrunner/*/all/
// @match        *://www.parkrun.co.nz/parkrunner/*/all/
// @match        *://www.parkrun.co.za/parkrunner/*/all/
// @match        *://www.parkrun.com.au/parkrunner/*/all/
// @match        *://www.parkrun.com.de/parkrunner/*/all/
// @match        *://www.parkrun.dk/parkrunner/*/all/
// @match        *://www.parkrun.fi/parkrunner/*/all/
// @match        *://www.parkrun.fr/parkrunner/*/all/
// @match        *://www.parkrun.ie/parkrunner/*/all/
// @match        *://www.parkrun.it/parkrunner/*/all/
// @match        *://www.parkrun.jp/parkrunner/*/all/
// @match        *://www.parkrun.lt/parkrunner/*/all/
// @match        *://www.parkrun.my/parkrunner/*/all/
// @match        *://www.parkrun.no/parkrunner/*/all/
// @match        *://www.parkrun.org.uk/parkrunner/*/all/
// @match        *://www.parkrun.pl/parkrunner/*/all/
// @match        *://www.parkrun.se/parkrunner/*/all/
// @match        *://www.parkrun.sg/parkrunner/*/all/
// @match        *://www.parkrun.us/parkrunner/*/all/
// @namespace    http://tampermonkey.net/
// @require      https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js
// @require      https://html2canvas.hertzen.com/dist/html2canvas.min.js
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @screenshot-url       https://www.parkrun.org.uk/parkrunner/1179626/all/
// @screenshot-selector  #p-index-progression-display
// @screenshot-timeout   8000
// @screenshot-viewport  1200x800
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/p-index-progression.user.js
// @version      1.0.0
// ==/UserScript==

(function () {
  'use strict';

  const {
    buildDifficultyMetrics,
    calculatePIndex,
    calculatePIndexProgression,
    groupFinishesByEvent,
    parseDateDdMmYyyy,
  } = require('../lib/p-index-core');

  const THEME = {
    backgroundColor: '#2b223d',
    accentColor: '#ffa300',
    textColor: '#f3f4f6',
    subtleTextColor: '#d1d5db',
    gridColor: 'rgba(243, 244, 246, 0.18)',
  };

  function getResponsiveConfig() {
    const mobileConfig = {
      container: { padding: '10px', marginTop: '10px' },
      typography: { heading: '1.2em' },
      button: { padding: '6px 12px', fontSize: '0.9em' },
      chart: { height: '280px', titleSize: 14, axisTitleSize: 12, tickSize: 10 },
    };
    const desktopConfig = {
      container: { padding: '20px', marginTop: '20px' },
      typography: { heading: '1.5em' },
      button: { padding: '8px 15px', fontSize: '1em' },
      chart: { height: '360px', titleSize: 16, axisTitleSize: 14, tickSize: 12 },
    };
    return window.innerWidth < 768 ? mobileConfig : desktopConfig;
  }

  if (
    typeof module !== 'undefined' &&
    module.exports &&
    typeof globalThis !== 'undefined' &&
    globalThis.process &&
    globalThis.process.versions &&
    globalThis.process.versions.node
  ) {
    module.exports = {
      buildCompactPlanSummary,
      buildDifficultySummary,
      buildSentencePlanSummary,
      extractFinishTimeline,
      findResultsTable,
    };
  } else {
    main();
  }

  function main() {
    const table = findResultsTable();
    if (!table) {
      console.error('Results table not found');
      return;
    }
    const finishTimeline = extractFinishTimeline(table);
    const groupedEvents = groupFinishesByEvent(finishTimeline);
    const pIndex = calculatePIndex(groupedEvents);
    const progression = calculatePIndexProgression(finishTimeline).map((point) => ({
      ...point,
      nextPlan: {
        ...point.nextPlan,
        compactSummary: buildCompactPlanSummary(point.nextPlan.actions),
      },
      lookaheadPlan: {
        ...point.lookaheadPlan,
        compactSummary: buildCompactPlanSummary(point.lookaheadPlan.actions),
      },
    }));
    displayProgression(progression, pIndex);
  }

  function displayProgression(progression, pIndex) {
    const responsive = getResponsiveConfig();
    const h2Element = document.querySelector('h2');
    if (!h2Element) return;

    const card = document.createElement('section');
    card.id = 'p-index-progression-display';
    card.style.width = '100%';
    card.style.maxWidth = '800px';
    card.style.margin = `${responsive.container.marginTop} auto`;
    card.style.backgroundColor = THEME.backgroundColor;
    card.style.color = THEME.accentColor;
    card.style.padding = responsive.container.padding;
    card.style.borderRadius = '5px';
    card.style.boxSizing = 'border-box';

    const title = document.createElement('h3');
    title.textContent = 'p-index progression over finishes';
    title.style.margin = '0 0 12px 0';
    title.style.fontSize = responsive.typography.heading;
    title.style.textAlign = 'center';
    card.appendChild(title);

    const chartContainer = document.createElement('div');
    chartContainer.style.height = responsive.chart.height;
    chartContainer.style.position = 'relative';
    chartContainer.style.width = '100%';
    chartContainer.id = 'p-index-progression-chart-container';
    card.appendChild(chartContainer);

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'p-index progression chart');
    chartContainer.appendChild(canvas);

    if (typeof window.Chart === 'undefined') {
      const fallback = document.createElement('p');
      fallback.textContent = 'Chart unavailable: failed to load Chart.js.';
      fallback.style.color = THEME.subtleTextColor;
      fallback.style.marginTop = '12px';
      card.appendChild(fallback);
    } else {
      createProgressionChart(canvas, progression, responsive);
    }

    card.appendChild(renderSummary(buildDifficultySummary(progression, pIndex), pIndex));

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.marginTop = '12px';
    card.appendChild(controls);

    const downloadButton = document.createElement('button');
    downloadButton.type = 'button';
    downloadButton.textContent = '💾 Save chart image';
    styleActionButton(downloadButton, responsive);
    controls.appendChild(downloadButton);

    downloadButton.addEventListener('click', () => {
      downloadButton.disabled = true;
      downloadButton.textContent = 'Saving...';
      controls.style.visibility = 'hidden';
      html2canvas(card, {
        backgroundColor: THEME.backgroundColor,
        scale: 2,
        logging: false,
        allowTaint: true,
        useCORS: true,
      })
        .then((renderedCanvas) => {
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().split('T')[0];
          const pageUrl = window.location.pathname.split('/');
          const parkrunnerId = pageUrl[2] || 'parkrunner';
          link.download = `p-index-progression-${parkrunnerId}-${timestamp}.png`;
          link.href = renderedCanvas.toDataURL('image/png');
          link.click();
        })
        .finally(() => {
          controls.style.visibility = 'visible';
          downloadButton.disabled = false;
          downloadButton.textContent = '💾 Save chart image';
        });
    });

    h2Element.parentNode.insertBefore(card, h2Element.nextSibling);
  }

  function createProgressionChart(canvas, progression, responsive) {
    const allPoints = progression.map((point) => ({ x: point.finishes, y: point.pIndex, point }));

    return new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'p-index',
            data: allPoints,
            stepped: true,
            borderColor: THEME.accentColor,
            backgroundColor: THEME.accentColor,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Finishes',
              font: { size: responsive.chart.axisTitleSize },
              color: THEME.textColor,
            },
            ticks: {
              font: { size: responsive.chart.tickSize },
              stepSize: 1,
              color: THEME.subtleTextColor,
            },
            grid: { color: THEME.gridColor },
            min: 1,
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'p-index',
              font: { size: responsive.chart.axisTitleSize },
              color: THEME.textColor,
            },
            ticks: {
              font: { size: responsive.chart.tickSize },
              stepSize: 1,
              color: THEME.subtleTextColor,
            },
            grid: { color: THEME.gridColor },
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'p-index progression over finishes',
            font: { size: responsive.chart.titleSize },
            color: THEME.textColor,
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const point = context.raw.point;
                const labels = [
                  `p-index: ${point.pIndex}`,
                  `Finishes: ${point.finishes}`,
                  `Date: ${point.date}`,
                  `Event: ${point.eventName} (#${point.eventNumber})`,
                  `Finishes since previous increase: ${point.finishesSincePreviousIncrease}`,
                  `Minimum finishes to next p-index: ${point.nextPlan.totalAdditionalFinishes}`,
                  `Plan: ${point.nextPlan.compactSummary}`,
                ];
                if (point.isJump) {
                  labels.push(`Increase reached: ${point.previousPIndex} and ${point.pIndex}`);
                }
                return labels;
              },
            },
          },
        },
      },
      plugins: [createJumpLabelsPlugin()],
    });
  }

  function createJumpLabelsPlugin() {
    return {
      id: 'jumpLabels',
      afterDatasetsDraw(chart) {
        const pIndexDataset = chart.data.datasets[0];
        const meta = chart.getDatasetMeta(0);
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = THEME.subtleTextColor;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        pIndexDataset.data.forEach((item, index) => {
          if (!item?.point?.isJump) return;
          const pointElement = meta.data[index];
          if (!pointElement) return;
          ctx.fillText(
            `+${item.point.finishesSincePreviousIncrease}`,
            pointElement.x,
            pointElement.y - 10
          );
        });
        ctx.restore();
      },
    };
  }

  function renderSummary(summary, pIndex) {
    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '12px';
    wrapper.style.marginBottom = '12px';
    wrapper.style.color = THEME.subtleTextColor;
    wrapper.style.fontSize = '0.95em';
    const list = document.createElement('ul');
    list.style.listStyleType = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    list.style.textAlign = 'left';
    summary.forEach((item) => {
      const li = document.createElement('li');
      li.style.marginBottom = '6px';
      li.textContent = item;
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    if (pIndex < 3) {
      const note = document.createElement('p');
      note.style.margin = '6px 0 0 0';
      note.style.fontStyle = 'italic';
      note.textContent = 'Trend note: very early p-index values can shift quickly.';
      wrapper.appendChild(note);
    }
    return wrapper;
  }

  function styleActionButton(button, responsive) {
    button.style.padding = responsive.button.padding;
    button.style.backgroundColor = THEME.accentColor;
    button.style.color = THEME.backgroundColor;
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = responsive.button.fontSize;
  }

  function extractFinishTimeline(table) {
    const finishes = [];
    const rows = table.querySelectorAll('tbody > tr');
    rows.forEach((row) => {
      const eventName = row.querySelector('td:nth-child(1)').textContent.trim();
      const date = row.querySelector('td:nth-child(2)').textContent.trim();
      const eventNumber = row.querySelector('td:nth-child(3)').textContent.trim();
      finishes.push({ eventName, date, eventNumber });
    });
    return finishes.sort((a, b) => parseDateDdMmYyyy(a.date) - parseDateDdMmYyyy(b.date));
  }

  function findResultsTable() {
    const tables = document.querySelectorAll('#results');
    return tables[tables.length - 1];
  }

  function buildDifficultySummary(progression, pIndex) {
    const metrics = buildDifficultyMetrics(progression, pIndex);
    const nextFinishWord = metrics.nextPlan.totalAdditionalFinishes === 1 ? 'finish' : 'finishes';
    const lookaheadFinishWord =
      metrics.lookaheadPlan.totalAdditionalFinishes === 1 ? 'finish' : 'finishes';

    return [
      `Current p-index: ${pIndex}`,
      `Finishes since previous increase: ${metrics.latestGap}`,
      `Longest gap: ${metrics.longestGap} finishes (between p-index ${metrics.startLevel} and ${metrics.endLevel})`,
      `Minimum finishes to next p-index ${metrics.nextTarget}: ${metrics.nextPlan.totalAdditionalFinishes} ${nextFinishWord}. ${buildSentencePlanSummary(metrics.nextPlan.actions)}`,
      `Then minimum finishes to p-index ${metrics.lookaheadTarget}: ${metrics.lookaheadPlan.totalAdditionalFinishes} ${lookaheadFinishWord}. ${buildSentencePlanSummary(metrics.lookaheadPlan.actions)}`,
    ];
  }

  function buildCompactPlanSummary(actions) {
    if (actions.length === 0) return 'No additional finishes required.';
    return actions.map((action) => `+${action.additionalFinishes} ${action.eventName}`).join(', ');
  }

  function buildSentencePlanSummary(actions) {
    if (actions.length === 0) return 'No additional finishes required.';
    const singleFinishNames = actions
      .filter((action) => action.additionalFinishes === 1)
      .map((action) => action.eventName);
    const multiFinishActions = actions.filter((action) => action.additionalFinishes > 1);
    const clauses = [];

    if (singleFinishNames.length === 1) clauses.push(`add ${singleFinishNames[0]} once`);
    else if (singleFinishNames.length > 1)
      clauses.push(`add ${joinWithCommasAnd(singleFinishNames)} once`);

    multiFinishActions.forEach((action) => {
      clauses.push(`add ${action.eventName} ${action.additionalFinishes} times`);
    });

    if (clauses.length === 1) return `${capitaliseFirst(clauses[0])}.`;
    if (clauses.length === 2) return `${capitaliseFirst(clauses[0])}, and ${clauses[1]}.`;
    return `${capitaliseFirst(clauses.slice(0, -1).join(', '))}, and ${clauses[clauses.length - 1]}.`;
  }

  function joinWithCommasAnd(values) {
    if (values.length === 0) return '';
    if (values.length === 1) return values[0];
    if (values.length === 2) return `${values[0]} and ${values[1]}`;
    return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
  }

  function capitaliseFirst(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
})();
