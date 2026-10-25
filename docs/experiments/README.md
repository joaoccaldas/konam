# Unified 3D Experiments

Experiments are isolated from production.

Each experiment must record:
- hypothesis;
- baseline SHA;
- candidate SHA;
- benchmark scene;
- device/runtime/viewport/DPR;
- implementation;
- metrics;
- visual evidence;
- result;
- confidence;
- decision: PROMOTE / REJECT / MORE_TESTING.

No experiment is allowed to silently become production architecture.

Current queue:
- EXP-001 visibility / room graph / HLOD (#115)
- EXP-003 Breitling HERO quality ladder (#116)
- EXP-005 Gaudí force-to-form operator (#117)

Planned next:
- EXP-002 KTX2 texture modes
- EXP-004 material sharing
- EXP-006 Bellagio reconstruction
- EXP-007 Studio-Kona scale baseline
- EXP-008 world partition / chunk streaming
