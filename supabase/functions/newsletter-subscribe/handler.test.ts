import { assertEquals } from 'jsr:@std/assert@1';
import { handler } from './handler.ts';

// Executes the actual handler against synthetic Requests and injected mocks.
// Never uses real Supabase credentials, subscriber records or the internet.
const origin = 'https://joaoccaldas.github.io';
const base = 'https://unit.invalid/newsletter-subscribe';
const key = 'sb_publishable_lVueu3GqNcPe4Z9KsChvJw_VfmnVi5u';
const quota = async () => 'allowed' as const;
function request(body: unknown, options: { origin?: string, key?: string } = {}) {
  return new Request(base, { method:'POST', headers: {
    origin: options.origin ?? origin,
    apikey: options.key ?? key,
    'content-type':'application/json',
  }, body:JSON.stringify(body) });
}
function adminMock(existing: string | null = null) {
  const writes: Array<{action:string,payload:unknown}> = [];
  const query = {
    select: () => query,
    eq: () => query,
    neq: () => query,
    maybeSingle: async () => ({data:existing ? {status:existing} : null,error:null}),
    insert: async (payload:unknown) => {writes.push({action:'insert',payload});return {error:null};},
    update: (payload:unknown) => {
      writes.push({action:'update',payload});
      return query;
    },
    then: (resolve: (v:unknown)=>void) => resolve({error:null}),
  };
  const admin = { from: (_:string) => query };
  return {admin: admin as any,writes};
}
Deno.test('rejects malformed and oversized requests before database calls', async () => {
  const fake=adminMock();
  let res=await handler(request({email:'not-an-email'}),{admin:fake.admin,quota});
  assertEquals(res.status,400);
  assertEquals(fake.writes.length,0);
  res=await handler(request({email:'a'.repeat(2100)}),{admin:fake.admin,quota});
  assertEquals(res.status,400);
  assertEquals(fake.writes.length,0);
});
Deno.test('signup rejects disallowed origin or app key', async () => {
  const fake=adminMock();
  assertEquals((await handler(request({email:'a@example.test'},{origin:'https://example.test'}),{admin:fake.admin,quota})).status,403);
  assertEquals((await handler(request({email:'a@example.test'},{key:'wrong'}),{admin:fake.admin,quota})).status,401);
  assertEquals(fake.writes.length,0);
});
Deno.test('existing unsubscribed or suppressed subscription is never modified by anonymous signup', async () => {
  for (const status of ['unsubscribed','suppressed','active','pending']) {
    const fake=adminMock(status);
    const res=await handler(request({email:'a@example.test'}),{admin:fake.admin,quota});
    assertEquals(res.status,202);
    assertEquals(fake.writes.length,0);
  }
});
Deno.test('new signup stores pending and normalized email in source version', async () => {
  const fake=adminMock();
  const res=await handler(request({email:'  Test@Example.Test  '}),{admin:fake.admin,quota});
  assertEquals(res.status,202);
  assertEquals(fake.writes.length,1);
  assertEquals(fake.writes[0].action,'insert');
  assertEquals((fake.writes[0].payload as any).status,'pending');
  assertEquals((fake.writes[0].payload as any).email,'test@example.test');
});
Deno.test('quota rejection fails closed before database access', async () => {
  const fake=adminMock();
  const denied=await handler(request({email:'a@example.test'}),{admin:fake.admin,quota: async ()=>'limited' as const});
  const unavailable=await handler(request({email:'a@example.test'}),{admin:fake.admin,quota: async ()=>'unavailable' as const});
  assertEquals(denied.status,429);
  assertEquals(unavailable.status,503);
  assertEquals(fake.writes.length,0);
});
Deno.test('GET unsubscribe token cannot mutate state', async () => {
  const fake=adminMock();
  const res=await handler(new Request(base+'?unsubscribe='+'a'.repeat(64)),{admin:fake.admin,quota});
  assertEquals(res.status,303);
  assertEquals(fake.writes.length,0);
});
