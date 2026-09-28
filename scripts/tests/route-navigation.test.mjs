import assert from 'node:assert/strict';
import { readNavigationEntry, NAVIGATION_KEY, fallbackBackHref, isBackSwipe, usesNativeEdgeBack } from '../../apps/web/src/lib/route-navigation.ts';

assert.equal(readNavigationEntry(null), null);
assert.equal(readNavigationEntry({[NAVIGATION_KEY]:{depth:-1,href:'/',scrollY:0}}), null);
assert.equal(readNavigationEntry({[NAVIGATION_KEY]:{depth:1,href:'//evil.test',scrollY:0}}), null);
assert.equal(readNavigationEntry({[NAVIGATION_KEY]:{depth:1,href:'/',scrollY:Infinity}}), null);
assert.deepEqual(readNavigationEntry({router:'preserved',[NAVIGATION_KEY]:{depth:2,href:'/?platform=Web',scrollY:450}}),{depth:2,href:'/?platform=Web',scrollY:450});
assert.equal(fallbackBackHref('/admin/listings/1/preview'), '/admin');
assert.equal(fallbackBackHref('/launch-archive'), '/profile');
assert.equal(fallbackBackHref('/popular'), '/');
assert.equal(isBackSwipe(10,100,5,300),true);
for(const args of [[30,100,0,300],[10,-100,0,300],[10,100,70,300],[10,40,0,300],[10,100,0,1000]])assert.equal(isBackSwipe(...args),false);
assert.equal(usesNativeEdgeBack('iPhone','iPhone',5),true);
assert.equal(usesNativeEdgeBack('Safari','MacIntel',5),true);
assert.equal(usesNativeEdgeBack('Android','Linux',5),false);
console.log('Navigation metadata, fallback, swipe intent and native iOS rules passed.');
