// ==UserScript==
// @name         parkrun Volunteer Days Display
// @namespace    http://tampermonkey.net/
// @version      2025-04-20
// @description  Displays the number of volunteer days for parkrun finishers on results pages
// @author       @johnsyweb
// @match        *://www.parkrun.com.au/*/results/*
// @match        *://www.parkrun.co.at/*/results/*
// @match        *://www.parkrun.ca/*/results/*
// @match        *://www.parkrun.dk/*/results/*
// @match        *://www.parkrun.fi/*/results/*
// @match        *://www.parkrun.fr/*/results/*
// @match        *://www.parkrun.com.de/*/results/*
// @match        *://www.parkrun.ie/*/results/*
// @match        *://www.parkrun.it/*/results/*
// @match        *://www.parkrun.jp/*/results/*
// @match        *://www.parkrun.lt/*/results/*
// @match        *://www.parkrun.my/*/results/*
// @match        *://www.parkrun.co.nl/*/results/*
// @match        *://www.parkrun.co.nz/*/results/*
// @match        *://www.parkrun.no/*/results/*
// @match        *://www.parkrun.pl/*/results/*
// @match        *://www.parkrun.sg/*/results/*
// @match        *://www.parkrun.co.za/*/results/*
// @match        *://www.parkrun.se/*/results/*
// @match        *://www.parkrun.org.uk/*/results/*
// @match        *://www.parkrun.us/*/results/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parkrun.com.au
// @grant        none
// @tag          parkrun
// @run-at       document-end
// @homepage     https://github.com/johnsyweb/tampermonkey-parkrun
// @supportURL   https://github.com/johnsyweb/tampermonkey-parkrun/issues/
// @downloadURL  https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days.user.js
// @updateURL    https://raw.githubusercontent.com/johnsyweb/tampermonkey-parkrun/refs/heads/main/volunteer-days.user.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Adds volunteer day information to each finisher who has volunteered
     */
    function showVolunteerDays() {
        document
            .querySelectorAll(
                'tr[data-vols] > td.Results-table-td.Results-table-td--name > div.detailed'
            )
            .forEach((div) => {
                const volDays = div.closest('tr').getAttribute('data-vols');

                if (volDays && parseInt(volDays) > 0) {
                    const volSpan = document.createElement('span');
                    volSpan.textContent = `${volDays} volunteer day${volDays === '1' ? '' : 's'} | `;
                    volSpan.classList.add('volunteer-days');
                    volSpan.style.color = '#d35226';
                    div.insertBefore(volSpan, div.firstChild);
                }
            });
    }

    /**
     * Waits for the page to fully load before adding volunteer information
     */
    function init() {
        const resultsTable = document.querySelector('.Results-table');
        if (resultsTable) {
            showVolunteerDays();
        } else {
            setTimeout(init, 500);
        }
    }

    init();
})();
