// @jest-environment jsdom

const { isLaunchEvent, init } = require('../src/launch-returnees.user.js');

describe('launch-returnees', () => {
  describe('isLaunchEvent', () => {
    it('returns true when the page indicates event #1', () => {
      document.body.innerHTML =
        '<h3><span class="format-date">31/1/2026</span><span class="spacer"> | </span><span>#1</span></h3>';

      expect(isLaunchEvent(document)).toBe(true);
    });

    it('returns false when the page is not the launch event', () => {
      document.body.innerHTML =
        '<h3><span class="format-date">7/2/2026</span><span class="spacer"> | </span><span>#2</span></h3>';

      expect(isLaunchEvent(document)).toBe(false);
    });
  });

  describe('init', () => {
    it('exits early on a launch event page', async () => {
      document.body.innerHTML =
        '<h3><span class="format-date">31/1/2026</span><span class="spacer"> | </span><span>#1</span></h3>';

      const originalFetch = global.fetch;
      global.fetch = jest.fn();

      await init();

      expect(global.fetch).not.toHaveBeenCalled();
      expect(document.getElementById('parkrun-launch-returnees')).toBeNull();

      global.fetch = originalFetch;
    });
  });
});
