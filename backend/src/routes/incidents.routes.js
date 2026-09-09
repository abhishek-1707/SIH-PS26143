'use strict';
const router = require('express').Router();
const service = require('../services/incident.service');

const handle = fn => async (req, res, next) => {
    try { await fn(req, res); } catch (error) { next(error); }
};

router.get('/scenes', (req, res) => res.json([{
    id: 'demo-arabian-sea',
    name: 'Arabian Sea synthetic SAR exercise',
    source: 'synthetic_demo',
    description: 'Deterministic SAR-like raster, environmental vectors and fictional vessel tracks. Not an observed pollution incident.'
}]));
router.post('/analyze', handle(async (req, res) => res.status(201).json(await service.analyze(req.body))));
router.get('/', handle(async (req, res) => res.json(await service.list())));
router.get('/:id', handle(async (req, res) => res.json(await service.get(req.params.id))));
router.get('/:id/report', handle(async (req, res) => {
    const report = await service.get(req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="osis-${report.id}.json"`);
    res.json(report);
}));
router.get('/:id/spill', handle(async (req, res) => {
    const r = await service.get(req.params.id);
    res.json({ spill: r.spill || null, detections: r.detections, age: r.age || null, scene: r.scene, mask: r.mask });
}));
router.get('/:id/origin', handle(async (req, res) => {
    const r = await service.get(req.params.id);
    res.json({ origin: r.origin || null, backward: r.backward || [] });
}));
router.get('/:id/drift', handle(async (req, res) => {
    const r = await service.get(req.params.id);
    res.json({ backward: r.backward || [], forward: r.forward || [], environment: r.environment });
}));
router.get('/:id/vessels', handle(async (req, res) => {
    const r = await service.get(req.params.id);
    res.json({ candidates: r.candidates || [], anomalies: r.anomalies || [], scoring: r.scoring });
}));
router.get('/:id/vessels/:mmsi', handle(async (req, res) => {
    const r = await service.get(req.params.id);
    const candidate = r.candidates?.find(c => c.mmsi === req.params.mmsi);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found in incident' });
    res.json(candidate);
}));
module.exports = router;