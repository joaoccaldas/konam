import {publicIPv4,publicURL,parseFeed,resolveFeed,toRSS} from './providers.ts';
import assert from 'node:assert/strict';
Deno.test('reject internal, metadata, reserved and mapped addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.1.1','169.254.169.254','100.64.0.1','172.16.1.1','192.168.2.1','0.0.0.0','224.1.1.1','198.18.0.1','::ffff:127.0.0.1'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
 for(const url of ['http://example.com/feed','https://user:pass@example.com','https://localhost/a','https://127.0.0.1','https://2130706433','https://[::1]','https://example.com:8080/feed','file:///etc/passwd'])assert.throws(()=>publicURL(url),url);
});
Deno.test('RSS and Atom strip markup, reject unsafe URLs and future dates',()=>{
 const rss='<rss><channel><title>Test</title><item><title><![CDATA[<b>Race</b> &amp; ride]]></title><link>https://example.com/a</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item><item><title>X</title><link>javascript:alert(1)</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>';
 const data=parseFeed(rss,'https://example.com/feed','news',Date.parse('2026-10-01'));
 assert.equal(data.items.length,1);assert.equal(data.items[0]!.title,'Race & ride');
 assert.throws(()=>parseFeed('<!DOCTYPE x [<!ENTITY x "boom">]><rss/>','https://example.com/feed','news'));
 const xml=toRSS({items:data.items});assert.match(xml,/Race &amp; ride/);
});
Deno.test('YouTube channel URLs normalize without trusting arbitrary paths',async()=>{
 assert.equal(await resolveFeed('https://youtube.com/channel/UC6PP69DCmBwMCPf9RSSTNTg'),'https://www.youtube.com/feeds/videos.xml?channel_id=UC6PP69DCmBwMCPf9RSSTNTg');
 await assert.rejects(resolveFeed('https://youtube.com/watch?v=123'));
});
