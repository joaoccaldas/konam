// Optional reading/travel surfaces, loaded by the existing shell script loader on intent.
import {renderFeed,renderTravel} from './ui/companion.js';
globalThis.__konaCompanionUI=Object.freeze({renderFeed,renderTravel});
