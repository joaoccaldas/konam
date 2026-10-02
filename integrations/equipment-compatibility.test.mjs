import assert from "node:assert/strict";
import {assessComponentCompatibility} from "./equipment-compatibility.mjs";
import {getCandidateComponent} from "./candidate-components.mjs";

const front=getCandidateComponent("dt-swiss-arc1100-db80-front");
const rear=getCandidateComponent("dt-swiss-arc1100-db80-rear");
const cassette=getCandidateComponent("shimano-cs-r9200-11-30");
const crank=getCandidateComponent("shimano-fc-r9200-54-40-170");
const ext=getCandidateComponent("profile-design-43asc-400");

const bike={
  schema_version:1,
  entity_id:"test-bike",
  interfaces:{
    wheel_front:{wheel_standard:"700C / 29in",axle:"12x100",brake:"Center Lock disc"},
    wheel_rear:{wheel_standard:"700C / 29in",axle:"12x142",brake:"Center Lock disc"},
    drivetrain:{rear_speeds:12},
    crank:{rear_speeds:12,chainline_mm:44.5},
    aerobar_extensions:{clamp_outer_diameter_mm:22.2}
  }
};

assert.equal(assessComponentCompatibility(front,bike).status,"compatible");
assert.equal(assessComponentCompatibility(rear,bike).status,"compatible");
assert.equal(assessComponentCompatibility(cassette,bike).status,"compatible");
assert.equal(assessComponentCompatibility(crank,bike).status,"compatible");
assert.equal(assessComponentCompatibility(ext,bike).status,"compatible");

const wrong={
  schema_version:1,
  entity_id:"wrong-bike",
  interfaces:{
    wheel_front:{wheel_standard:"700C / 29in",axle:"9x100",brake:"rim"},
    drivetrain:{rear_speeds:11}
  }
};
assert.equal(assessComponentCompatibility(front,wrong).status,"incompatible");
assert.equal(assessComponentCompatibility(cassette,wrong).status,"incompatible");
assert.equal(assessComponentCompatibility(crank,{schema_version:1,entity_id:"partial",interfaces:{}}).status,"unknown");

console.log("Equipment compatibility PASS");
