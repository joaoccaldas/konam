import {handler} from './handler.ts';
Deno.serve(req=>handler(req));
