// ==UserScript==
// @name         parkrun Volunteer Days Display
// @description  Displays the number of volunteer credits for parkrun finishers on results pages, for celebration purposes (and let's not make assumptions about ratios)
// @author       Pete Johns (@johnsyweb)
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days-display.user.js
// @grant        none
// @homepage     https://www.johnsy.com/tampermonkey-parkrun/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @license      MIT
// @match        *://www.parkrun.ca/*/results/*
// @match        *://www.parkrun.co.at/*/results/*
// @match        *://www.parkrun.co.nl/*/results/*
// @match        *://www.parkrun.co.nz/*/results/*
// @match        *://www.parkrun.co.za/*/results/*
// @match        *://www.parkrun.com.au/*/results/*
// @match        *://www.parkrun.com.de/*/results/*
// @match        *://www.parkrun.dk/*/results/*
// @match        *://www.parkrun.fi/*/results/*
// @match        *://www.parkrun.fr/*/results/*
// @match        *://www.parkrun.ie/*/results/*
// @match        *://www.parkrun.it/*/results/*
// @match        *://www.parkrun.jp/*/results/*
// @match        *://www.parkrun.lt/*/results/*
// @match        *://www.parkrun.my/*/results/*
// @match        *://www.parkrun.no/*/results/*
// @match        *://www.parkrun.org.uk/*/results/*
// @match        *://www.parkrun.pl/*/results/*
// @match        *://www.parkrun.se/*/results/*
// @match        *://www.parkrun.sg/*/results/*
// @match        *://www.parkrun.us/*/results/*
// @namespace    http://tampermonkey.net/
// @run-at       document-end
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @tag          parkrun
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days-display.user.js
// @version      1.1.2
// ==/UserScript==
// DO NOT EDIT - generated from src/ by scripts/build-scripts.js

(function () {
  'use strict';

  /**
   * Adds volunteer credit information to each finisher who has volunteered
   */
  function showVolunteerCredits() {
    document.querySelectorAll('tr[data-vols] > td.Results-table-td.Results-table-td--name > div.detailed').forEach(function (div) {
      var volDays = div.closest('tr').getAttribute('data-vols');
      if (volDays && parseInt(volDays) > 0) {
        var spacer = document.createElement('span');
        spacer.classList.add('spacer');
        spacer.textContent = ' | ';
        var volSpan = document.createElement('span');
        volSpan.textContent = "".concat(volDays, " volunteer credit").concat(volDays === '1' ? '' : 's');
        volSpan.classList.add('volunteer-days');

        // In responsive detailed view, gender position is wrapped in a Results-tablet span.
        // Insert volunteer credits immediately after the finish count (before gender block) when present.
        var genderTablet = div.querySelector('.Results-tablet');
        if (genderTablet) {
          div.insertBefore(spacer, genderTablet);
          spacer.insertAdjacentElement('afterend', volSpan);
        } else {
          var firstElement = div.firstElementChild;
          if (firstElement) {
            firstElement.insertAdjacentElement('afterend', spacer);
            spacer.insertAdjacentElement('afterend', volSpan);
          } else {
            div.appendChild(volSpan);
          }
        }
      }
    });
  }

  /**
   * Waits for the page to fully load before adding volunteer information
   */
  function init() {
    var firstRow = document.querySelector('tr[data-vols]');
    if (firstRow) {
      showVolunteerCredits();
      addVolunteerCreditsSort();
    } else {
      setTimeout(init, 500);
    }
  }

  /**
   * Adds sort options for volunteer credits and wires up sorting behaviour
   */
  function addVolunteerCreditsSort() {
    var firstRow = document.querySelector('tr[data-vols]');
    if (!firstRow) return;
    var tbody = firstRow.closest('tbody');
    // Try to find an existing sort <select>
    var sortSelect = document.querySelector('select[name="sort"], .Results-sort select, select.Results-sort, .Results-controls select');

    // Sorting function using data-vols
    function sortByVolunteerCredits(direction) {
      if (!tbody) return;
      // Include all rows in tbody; treat missing data-vols as 0
      var rows = Array.from(tbody.querySelectorAll('tr'));

      // Keep original order index to ensure stable sort for ties
      var indexed = rows.map(function (row, index) {
        return {
          row: row,
          index: index
        };
      });
      indexed.sort(function (a, b) {
        var av = parseInt(a.row.getAttribute('data-vols') || '0', 10);
        var bv = parseInt(b.row.getAttribute('data-vols') || '0', 10);
        if (av === bv) return a.index - b.index;
        return direction === 'asc' ? av - bv : bv - av;
      });

      // Re-append sorted finisher rows; other rows remain in place
      indexed.forEach(function (_ref) {
        var row = _ref.row;
        return tbody.appendChild(row);
      });
    }

    // If there's an existing select, augment it
    if (sortSelect) {
      // Add options if not already present
      if (!sortSelect.querySelector('option[value="vols-asc"]')) {
        var optAsc = new Option('Sort by volunteer credits ▲', 'vols-asc');
        var optDesc = new Option('Sort by volunteer credits ▼', 'vols-desc');
        sortSelect.appendChild(optAsc);
        sortSelect.appendChild(optDesc);
      }

      // Avoid adding duplicate listeners
      if (!sortSelect.dataset.volsSortWired) {
        // Capture phase listener to prevent native handlers when using our custom options
        sortSelect.addEventListener('change', function (e) {
          var value = e.target.value || '';
          if (value === 'vols-asc' || value === 'vols-desc') {
            if (e.cancelable) e.preventDefault();
            if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
            sortByVolunteerCredits(value.endsWith('asc') ? 'asc' : 'desc');
          }
        }, true);
        // Bubble phase listener (fallback) if capture was bypassed
        sortSelect.addEventListener('change', function (e) {
          var value = e.target.value || '';
          if (value === 'vols-asc') {
            sortByVolunteerCredits('asc');
          } else if (value === 'vols-desc') {
            sortByVolunteerCredits('desc');
          }
        });
        sortSelect.dataset.volsSortWired = 'true';
      }
    }

    // Also augment the responsive "View Settings" sort dialog when present
    var dialogSortOptions = document.querySelector('.Results-dialog-options[data-name="sort"]');
    if (dialogSortOptions && !dialogSortOptions.querySelector('[data-vols-sort="true"]')) {
      var option = document.createElement('div');
      option.className = 'Results-dialog-option Results-dialog-option--block js-ResultsOption';
      option.dataset.volsSort = 'true';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'Results-dialog-button';
      var label = document.createElement('span');
      label.textContent = 'Sort by volunteer credits';
      button.appendChild(label);
      var arrows = document.createElement('div');
      arrows.className = 'Results-dialog-arrows';
      var ascButton = document.createElement('button');
      ascButton.type = 'button';
      ascButton.className = 'Results-dialog-arrow js-ResultsDirection';
      ascButton.dataset.value = 'vols-asc';
      ascButton.textContent = '▲';
      var descButton = document.createElement('button');
      descButton.type = 'button';
      descButton.className = 'Results-dialog-arrow js-ResultsDirection';
      descButton.dataset.value = 'vols-desc';
      descButton.textContent = '▼';
      function applyDialogSort(direction) {
        sortByVolunteerCredits(direction);

        // Update selection styling to match core behaviour
        dialogSortOptions.querySelectorAll('.Results-dialog-option.js-ResultsOption').forEach(function (opt) {
          return opt.classList.remove('isSelected');
        });
        dialogSortOptions.querySelectorAll('.Results-dialog-arrow.js-ResultsDirection').forEach(function (arrow) {
          return arrow.classList.remove('isSelected');
        });
        option.classList.add('isSelected');
        if (direction === 'asc') {
          ascButton.classList.add('isSelected');
        } else {
          descButton.classList.add('isSelected');
        }
      }
      ascButton.addEventListener('click', function (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        applyDialogSort('asc');
      });
      descButton.addEventListener('click', function (event) {
        if (event.cancelable) event.preventDefault();
        event.stopPropagation();
        applyDialogSort('desc');
      });
      arrows.appendChild(ascButton);
      arrows.appendChild(descButton);
      option.appendChild(button);
      option.appendChild(arrows);
      dialogSortOptions.appendChild(option);
    }
  }
  init();
})();