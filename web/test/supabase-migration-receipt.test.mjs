import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const sql=fs.readFileSync(new URL('../../supabase/migrations/20260930073000_harden_user_app_state_privileges.sql',import.meta.url),'utf8').toLowerCase();
test('least privilege migration is recorded in repo',()=>{assert.match(sql,/revoke truncate, references, trigger/);assert.match(sql,/authenticated/);});
test('migration contains no credential material',()=>assert.equal(/service_role|password\s*=|secret\s*=/.test(sql),false));
