import { describe, expect, it } from 'vitest';
import { appliIntegree, lienChrome, systeme } from '../../src/lib/navigateur-integre.js';

const FB_ANDROID = 'Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/484.0.0.53.109;]';
const FB_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/482.0.0.39.104;FBBV/650000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/80]';
const MESSENGER = 'Mozilla/5.0 (Linux; Android 12; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/470.0.0.40.109;]';
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0.0 (iPhone14,7; iOS 17_5; fr_FR)';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';

describe('appliIntegree', () => {
  it('recognises the Facebook browser on both systems', () => {
    expect(appliIntegree(FB_ANDROID)).toBe('Facebook');
    expect(appliIntegree(FB_IOS)).toBe('Facebook');
  });

  it('tells Messenger and Instagram apart from Facebook', () => {
    expect(appliIntegree(MESSENGER)).toBe('Messenger');
    expect(appliIntegree(INSTAGRAM)).toBe('Instagram');
  });

  it('leaves real browsers alone', () => {
    expect(appliIntegree(CHROME_ANDROID)).toBeNull();
    expect(appliIntegree(SAFARI_IOS)).toBeNull();
    expect(appliIntegree('')).toBeNull();
    expect(appliIntegree(undefined)).toBeNull();
  });
});

describe('systeme', () => {
  it('reads the operating system from the user agent', () => {
    expect(systeme(FB_ANDROID)).toBe('android');
    expect(systeme(FB_IOS)).toBe('ios');
    expect(systeme('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('autre');
  });
});

describe('lienChrome', () => {
  it('builds an Android intent that reopens the same page in Chrome', () => {
    const lien = lienChrome('https://prep-upp.com/ressources');
    expect(lien).toBe(
      'intent://prep-upp.com/ressources#Intent;scheme=https;package=com.android.chrome;'
      + 'S.browser_fallback_url=https%3A%2F%2Fprep-upp.com%2Fressources;end',
    );
  });

  it('keeps the query string', () => {
    expect(lienChrome('https://prep-upp.com/ressources?x=1')).toMatch(/^intent:\/\/prep-upp\.com\/ressources\?x=1#Intent;/);
  });
});
