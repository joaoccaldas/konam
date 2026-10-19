import fs from 'node:fs';import {auditCatalog} from './catalog.mjs';
const filename=process.argv[2];if(!filename){console.error('Usage: node incubation/rotaverk/bridge/audit.mjs catalog.json');process.exit(2);}
try{const report=auditCatalog(JSON.parse(fs.readFileSync(filename,'utf8')));console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
