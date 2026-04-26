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
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/p-index-progression.user.js
// @version      1.0.0
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // lib/p-index-core.js
  var require_p_index_core = __commonJS({
    "lib/p-index-core.js"(exports, module) {
      function parseDateDdMmYyyy(dateStr) {
        const [day, month, year] = dateStr.split("/").map((value) => parseInt(value, 10));
        return new Date(year, month - 1, day);
      }
      function groupFinishesByEvent(finishTimeline) {
        const grouped = finishTimeline.reduce((acc, { eventName, date, eventNumber }) => {
          if (!acc[eventName]) {
            acc[eventName] = [];
          }
          acc[eventName].push({ date, eventNumber });
          return acc;
        }, {});
        return Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
      }
      function calculatePIndex(groupedEvents) {
        const filteredGroupedEvents = groupedEvents.filter(([, events], index) => events.length > index);
        return filteredGroupedEvents.length;
      }
      function buildEventStats(finishes) {
        const statsMap = /* @__PURE__ */ new Map();
        finishes.forEach((finish, index) => {
          const existing = statsMap.get(finish.eventName) || { count: 0, lastVisitIndex: -1 };
          statsMap.set(finish.eventName, {
            count: existing.count + 1,
            lastVisitIndex: index
          });
        });
        return Array.from(statsMap.entries()).map(([eventName, stats]) => ({
          eventName,
          count: stats.count,
          lastVisitIndex: stats.lastVisitIndex
        }));
      }
      function calculateMinimumFinishesPlan(eventCounts, targetPIndex) {
        const scoredEvents = eventCounts.map((event) => ({
          eventName: event.eventName,
          count: event.count,
          lastVisitIndex: typeof event.lastVisitIndex === "number" ? event.lastVisitIndex : Number.NEGATIVE_INFINITY,
          score: Math.min(event.count, targetPIndex)
        })).sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (b.count !== a.count) return b.count - a.count;
          if (b.lastVisitIndex !== a.lastVisitIndex) return b.lastVisitIndex - a.lastVisitIndex;
          return a.eventName.localeCompare(b.eventName);
        });
        const selectedExisting = scoredEvents.slice(0, targetPIndex);
        const actions = [];
        let totalAdditionalFinishes = 0;
        const usedEventNames = new Set(eventCounts.map((event) => event.eventName));
        selectedExisting.filter((event) => event.count < targetPIndex).sort((a, b) => {
          if (a.lastVisitIndex !== b.lastVisitIndex) return a.lastVisitIndex - b.lastVisitIndex;
          return a.eventName.localeCompare(b.eventName);
        }).forEach((event) => {
          const additionalFinishes = Math.max(0, targetPIndex - event.count);
          actions.push({
            eventName: event.eventName,
            additionalFinishes,
            isNewEvent: false
          });
          totalAdditionalFinishes += additionalFinishes;
        });
        const missingEvents = Math.max(0, targetPIndex - selectedExisting.length);
        let newEventIndex = 1;
        for (let i = 0; i < missingEvents; i++) {
          while (usedEventNames.has(`New event ${newEventIndex}`)) {
            newEventIndex++;
          }
          const eventName = `New event ${newEventIndex}`;
          usedEventNames.add(eventName);
          actions.push({
            eventName,
            additionalFinishes: targetPIndex,
            isNewEvent: true
          });
          totalAdditionalFinishes += targetPIndex;
          newEventIndex++;
        }
        return {
          targetPIndex,
          totalAdditionalFinishes,
          actions
        };
      }
      function applyPlanToEventCounts(eventCounts, actions) {
        const countsMap = new Map(
          eventCounts.map((event) => [
            event.eventName,
            {
              count: event.count,
              lastVisitIndex: typeof event.lastVisitIndex === "number" ? event.lastVisitIndex : Number.NEGATIVE_INFINITY
            }
          ])
        );
        const nextVisitIndex = eventCounts.reduce(
          (max, event) => typeof event.lastVisitIndex === "number" ? Math.max(max, event.lastVisitIndex) : max,
          Number.NEGATIVE_INFINITY
        ) + 1;
        let runningVisitIndex = Number.isFinite(nextVisitIndex) ? nextVisitIndex : 0;
        actions.forEach((action) => {
          const existing = countsMap.get(action.eventName) || {
            count: 0,
            lastVisitIndex: Number.NEGATIVE_INFINITY
          };
          countsMap.set(action.eventName, {
            count: existing.count + action.additionalFinishes,
            lastVisitIndex: runningVisitIndex + action.additionalFinishes - 1
          });
          runningVisitIndex += action.additionalFinishes;
        });
        return Array.from(countsMap.entries()).map(([eventName, data]) => ({
          eventName,
          count: data.count,
          lastVisitIndex: data.lastVisitIndex
        }));
      }
      function calculatePIndexProgression(finishTimeline) {
        const progression = [];
        let previousPIndex = 0;
        let previousIncreaseFinish = 0;
        for (let i = 0; i < finishTimeline.length; i++) {
          const finishesToDate = finishTimeline.slice(0, i + 1);
          const eventStats = buildEventStats(finishesToDate);
          const grouped = groupFinishesByEvent(finishesToDate);
          const currentPIndex = calculatePIndex(grouped);
          const nextPlan = calculateMinimumFinishesPlan(eventStats, currentPIndex + 1);
          const projectedCounts = applyPlanToEventCounts(eventStats, nextPlan.actions);
          const lookaheadPlan = calculateMinimumFinishesPlan(projectedCounts, currentPIndex + 2);
          const finish = finishTimeline[i];
          const finishes = i + 1;
          const isJump = currentPIndex > previousPIndex;
          const finishesSincePreviousIncrease = finishes - previousIncreaseFinish;
          progression.push({
            finishes,
            date: finish.date,
            eventName: finish.eventName,
            eventNumber: finish.eventNumber,
            pIndex: currentPIndex,
            previousPIndex,
            isJump,
            finishesSincePreviousIncrease,
            nextPlan,
            lookaheadPlan
          });
          if (isJump) {
            previousIncreaseFinish = finishes;
            previousPIndex = currentPIndex;
          }
        }
        return progression;
      }
      function buildDifficultyMetrics(progression, pIndex) {
        if (progression.length === 0) {
          return {
            latestGap: 0,
            longestGap: 0,
            startLevel: 0,
            endLevel: 0,
            nextTarget: 1,
            nextPlan: {
              targetPIndex: 1,
              totalAdditionalFinishes: 1,
              actions: [{ eventName: "New event 1", additionalFinishes: 1, isNewEvent: true }]
            },
            lookaheadTarget: 2,
            lookaheadPlan: {
              targetPIndex: 2,
              totalAdditionalFinishes: 3,
              actions: [
                { eventName: "New event 2", additionalFinishes: 2, isNewEvent: true },
                { eventName: "New event 3", additionalFinishes: 1, isNewEvent: true }
              ]
            }
          };
        }
        const jumpPoints = progression.filter((point) => point.isJump);
        const latest = progression[progression.length - 1];
        const hardestJump = jumpPoints.reduce((hardest, point) => {
          if (!hardest || point.finishesSincePreviousIncrease > hardest.finishesSincePreviousIncrease) {
            return point;
          }
          return hardest;
        }, null);
        return {
          latestGap: latest.finishesSincePreviousIncrease,
          longestGap: hardestJump ? hardestJump.finishesSincePreviousIncrease : 0,
          startLevel: hardestJump ? hardestJump.previousPIndex : 0,
          endLevel: hardestJump ? hardestJump.pIndex : 0,
          nextTarget: pIndex + 1,
          nextPlan: latest.nextPlan,
          lookaheadTarget: pIndex + 2,
          lookaheadPlan: latest.lookaheadPlan
        };
      }
      module.exports = {
        applyPlanToEventCounts,
        buildDifficultyMetrics,
        buildEventStats,
        calculateMinimumFinishesPlan,
        calculatePIndex,
        calculatePIndexProgression,
        groupFinishesByEvent,
        parseDateDdMmYyyy
      };
    }
  });

  // src/p-index-progression.user.js
  var require_p_index_progression_user = __commonJS({
    "src/p-index-progression.user.js"(exports, module) {
      (function() {
        "use strict";
        const {
          buildDifficultyMetrics,
          calculatePIndex,
          calculatePIndexProgression,
          groupFinishesByEvent,
          parseDateDdMmYyyy
        } = require_p_index_core();
        const THEME = {
          backgroundColor: "#2b223d",
          accentColor: "#ffa300",
          textColor: "#f3f4f6",
          subtleTextColor: "#d1d5db",
          gridColor: "rgba(243, 244, 246, 0.18)"
        };
        function getResponsiveConfig() {
          const mobileConfig = {
            container: { padding: "10px", marginTop: "10px" },
            typography: { heading: "1.2em" },
            button: { padding: "6px 12px", fontSize: "0.9em" },
            chart: { height: "280px", titleSize: 14, axisTitleSize: 12, tickSize: 10 }
          };
          const desktopConfig = {
            container: { padding: "20px", marginTop: "20px" },
            typography: { heading: "1.5em" },
            button: { padding: "8px 15px", fontSize: "1em" },
            chart: { height: "360px", titleSize: 16, axisTitleSize: 14, tickSize: 12 }
          };
          return window.innerWidth < 768 ? mobileConfig : desktopConfig;
        }
        if (typeof module !== "undefined" && module.exports && typeof globalThis !== "undefined" && globalThis.process && globalThis.process.versions && globalThis.process.versions.node) {
          module.exports = {
            buildCompactPlanSummary,
            buildDifficultySummary,
            buildSentencePlanSummary,
            extractFinishTimeline,
            findResultsTable
          };
        } else {
          main();
        }
        function main() {
          const table = findResultsTable();
          if (!table) {
            console.error("Results table not found");
            return;
          }
          const finishTimeline = extractFinishTimeline(table);
          const groupedEvents = groupFinishesByEvent(finishTimeline);
          const pIndex = calculatePIndex(groupedEvents);
          const progression = calculatePIndexProgression(finishTimeline).map((point) => ({
            ...point,
            nextPlan: {
              ...point.nextPlan,
              compactSummary: buildCompactPlanSummary(point.nextPlan.actions)
            },
            lookaheadPlan: {
              ...point.lookaheadPlan,
              compactSummary: buildCompactPlanSummary(point.lookaheadPlan.actions)
            }
          }));
          displayProgression(progression, pIndex);
        }
        function displayProgression(progression, pIndex) {
          const responsive = getResponsiveConfig();
          const h2Element = document.querySelector("h2");
          if (!h2Element) return;
          const card = document.createElement("section");
          card.id = "p-index-progression-display";
          card.style.width = "100%";
          card.style.maxWidth = "800px";
          card.style.margin = `${responsive.container.marginTop} auto`;
          card.style.backgroundColor = THEME.backgroundColor;
          card.style.color = THEME.accentColor;
          card.style.padding = responsive.container.padding;
          card.style.borderRadius = "5px";
          card.style.boxSizing = "border-box";
          const title = document.createElement("h3");
          title.textContent = "p-index progression over finishes";
          title.style.margin = "0 0 12px 0";
          title.style.fontSize = responsive.typography.heading;
          title.style.textAlign = "center";
          card.appendChild(title);
          const chartContainer = document.createElement("div");
          chartContainer.style.height = responsive.chart.height;
          chartContainer.style.position = "relative";
          chartContainer.style.width = "100%";
          chartContainer.id = "p-index-progression-chart-container";
          card.appendChild(chartContainer);
          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-label", "p-index progression chart");
          chartContainer.appendChild(canvas);
          if (typeof window.Chart === "undefined") {
            const fallback = document.createElement("p");
            fallback.textContent = "Chart unavailable: failed to load Chart.js.";
            fallback.style.color = THEME.subtleTextColor;
            fallback.style.marginTop = "12px";
            card.appendChild(fallback);
          } else {
            createProgressionChart(canvas, progression, responsive);
          }
          card.appendChild(renderSummary(buildDifficultySummary(progression, pIndex), pIndex));
          const controls = document.createElement("div");
          controls.style.display = "flex";
          controls.style.justifyContent = "center";
          controls.style.marginTop = "12px";
          card.appendChild(controls);
          const downloadButton = document.createElement("button");
          downloadButton.type = "button";
          downloadButton.textContent = "💾 Save chart image";
          styleActionButton(downloadButton, responsive);
          controls.appendChild(downloadButton);
          downloadButton.addEventListener("click", () => {
            downloadButton.disabled = true;
            downloadButton.textContent = "Saving...";
            controls.style.visibility = "hidden";
            html2canvas(card, {
              backgroundColor: THEME.backgroundColor,
              scale: 2,
              logging: false,
              allowTaint: true,
              useCORS: true
            }).then((renderedCanvas) => {
              const link = document.createElement("a");
              const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
              const pageUrl = window.location.pathname.split("/");
              const parkrunnerId = pageUrl[2] || "parkrunner";
              link.download = `p-index-progression-${parkrunnerId}-${timestamp}.png`;
              link.href = renderedCanvas.toDataURL("image/png");
              link.click();
            }).finally(() => {
              controls.style.visibility = "visible";
              downloadButton.disabled = false;
              downloadButton.textContent = "💾 Save chart image";
            });
          });
          h2Element.parentNode.insertBefore(card, h2Element.nextSibling);
        }
        function createProgressionChart(canvas, progression, responsive) {
          const allPoints = progression.map((point) => ({ x: point.finishes, y: point.pIndex, point }));
          return new window.Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
              datasets: [
                {
                  label: "p-index",
                  data: allPoints,
                  stepped: true,
                  borderColor: THEME.accentColor,
                  backgroundColor: THEME.accentColor,
                  borderWidth: 2,
                  pointRadius: 2,
                  pointHoverRadius: 4
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: {
                  type: "linear",
                  title: {
                    display: true,
                    text: "Finishes",
                    font: { size: responsive.chart.axisTitleSize },
                    color: THEME.textColor
                  },
                  ticks: {
                    font: { size: responsive.chart.tickSize },
                    stepSize: 1,
                    color: THEME.subtleTextColor
                  },
                  grid: { color: THEME.gridColor },
                  min: 1
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: "p-index",
                    font: { size: responsive.chart.axisTitleSize },
                    color: THEME.textColor
                  },
                  ticks: {
                    font: { size: responsive.chart.tickSize },
                    stepSize: 1,
                    color: THEME.subtleTextColor
                  },
                  grid: { color: THEME.gridColor }
                }
              },
              plugins: {
                title: {
                  display: true,
                  text: "p-index progression over finishes",
                  font: { size: responsive.chart.titleSize },
                  color: THEME.textColor
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
                        `Plan: ${point.nextPlan.compactSummary}`
                      ];
                      if (point.isJump) {
                        labels.push(`Increase reached: ${point.previousPIndex} and ${point.pIndex}`);
                      }
                      return labels;
                    }
                  }
                }
              }
            },
            plugins: [createJumpLabelsPlugin()]
          });
        }
        function createJumpLabelsPlugin() {
          return {
            id: "jumpLabels",
            afterDatasetsDraw(chart) {
              const pIndexDataset = chart.data.datasets[0];
              const meta = chart.getDatasetMeta(0);
              const ctx = chart.ctx;
              ctx.save();
              ctx.fillStyle = THEME.subtleTextColor;
              ctx.font = "11px sans-serif";
              ctx.textAlign = "center";
              pIndexDataset.data.forEach((item, index) => {
                var _a;
                if (!((_a = item == null ? void 0 : item.point) == null ? void 0 : _a.isJump)) return;
                const pointElement = meta.data[index];
                if (!pointElement) return;
                ctx.fillText(
                  `+${item.point.finishesSincePreviousIncrease}`,
                  pointElement.x,
                  pointElement.y - 10
                );
              });
              ctx.restore();
            }
          };
        }
        function renderSummary(summary, pIndex) {
          const wrapper = document.createElement("div");
          wrapper.style.marginTop = "12px";
          wrapper.style.marginBottom = "12px";
          wrapper.style.color = THEME.subtleTextColor;
          wrapper.style.fontSize = "0.95em";
          const list = document.createElement("ul");
          list.style.listStyleType = "none";
          list.style.padding = "0";
          list.style.margin = "0";
          list.style.textAlign = "left";
          summary.forEach((item) => {
            const li = document.createElement("li");
            li.style.marginBottom = "6px";
            li.textContent = item;
            list.appendChild(li);
          });
          wrapper.appendChild(list);
          if (pIndex < 3) {
            const note = document.createElement("p");
            note.style.margin = "6px 0 0 0";
            note.style.fontStyle = "italic";
            note.textContent = "Trend note: very early p-index values can shift quickly.";
            wrapper.appendChild(note);
          }
          return wrapper;
        }
        function styleActionButton(button, responsive) {
          button.style.padding = responsive.button.padding;
          button.style.backgroundColor = THEME.accentColor;
          button.style.color = THEME.backgroundColor;
          button.style.border = "none";
          button.style.borderRadius = "4px";
          button.style.cursor = "pointer";
          button.style.fontWeight = "bold";
          button.style.fontSize = responsive.button.fontSize;
        }
        function extractFinishTimeline(table) {
          const finishes = [];
          const rows = table.querySelectorAll("tbody > tr");
          rows.forEach((row) => {
            const eventName = row.querySelector("td:nth-child(1)").textContent.trim();
            const date = row.querySelector("td:nth-child(2)").textContent.trim();
            const eventNumber = row.querySelector("td:nth-child(3)").textContent.trim();
            finishes.push({ eventName, date, eventNumber });
          });
          return finishes.sort((a, b) => parseDateDdMmYyyy(a.date) - parseDateDdMmYyyy(b.date));
        }
        function findResultsTable() {
          const tables = document.querySelectorAll("#results");
          return tables[tables.length - 1];
        }
        function buildDifficultySummary(progression, pIndex) {
          const metrics = buildDifficultyMetrics(progression, pIndex);
          const nextFinishWord = metrics.nextPlan.totalAdditionalFinishes === 1 ? "finish" : "finishes";
          const lookaheadFinishWord = metrics.lookaheadPlan.totalAdditionalFinishes === 1 ? "finish" : "finishes";
          return [
            `Current p-index: ${pIndex}`,
            `Finishes since previous increase: ${metrics.latestGap}`,
            `Longest gap: ${metrics.longestGap} finishes (between p-index ${metrics.startLevel} and ${metrics.endLevel})`,
            `Minimum finishes to next p-index ${metrics.nextTarget}: ${metrics.nextPlan.totalAdditionalFinishes} ${nextFinishWord}. ${buildSentencePlanSummary(metrics.nextPlan.actions)}`,
            `Then minimum finishes to p-index ${metrics.lookaheadTarget}: ${metrics.lookaheadPlan.totalAdditionalFinishes} ${lookaheadFinishWord}. ${buildSentencePlanSummary(metrics.lookaheadPlan.actions)}`
          ];
        }
        function buildCompactPlanSummary(actions) {
          if (actions.length === 0) return "No additional finishes required.";
          return actions.map((action) => `+${action.additionalFinishes} ${action.eventName}`).join(", ");
        }
        function buildSentencePlanSummary(actions) {
          if (actions.length === 0) return "No additional finishes required.";
          const singleFinishNames = actions.filter((action) => action.additionalFinishes === 1).map((action) => action.eventName);
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
          return `${capitaliseFirst(clauses.slice(0, -1).join(", "))}, and ${clauses[clauses.length - 1]}.`;
        }
        function joinWithCommasAnd(values) {
          if (values.length === 0) return "";
          if (values.length === 1) return values[0];
          if (values.length === 2) return `${values[0]} and ${values[1]}`;
          return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
        }
        function capitaliseFirst(text) {
          if (!text) return text;
          return text.charAt(0).toUpperCase() + text.slice(1);
        }
      })();
    }
  });
  require_p_index_progression_user();
})();
