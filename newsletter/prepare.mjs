// Prepare private editor input as canonical HTML + a service-side SQL import.
// This deliberately has no send API. Gmail drafts are made by the existing task.
import fs from 'node:fs';
import path from 'node:path';
import {prepareNewsletter} from './render.mjs';
const [inputPath,outDir]=process.argv.slice(2);
if(!inputPath||!outDir)throw new Error('Usage: node newsletter/prepare.mjs PRIVATE_EDITION_JSON PRIVATE_OUTPUT_DIRECTORY');
const edition=prepareNewsletter(JSON.parse(fs.readFileSync(inputPath,'utf8')));
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const sql=`insert into public.newsletter_editions(id,subject,html,stories) values(${quote(edition.id)},${quote(edition.subject)},${quote(edition.html)},${quote(JSON.stringify(edition.stories))}::jsonb) on conflict(id) do nothing;\n`;
fs.mkdirSync(outDir,{recursive:true,mode:0o700});
fs.writeFileSync(path.join(outDir,'edition.html'),edition.html,{mode:0o600});
fs.writeFileSync(path.join(outDir,'edition.sql'),sql,{mode:0o600});
console.log('Prepared '+edition.id+' for Gmail draft review. No mail sent.');
