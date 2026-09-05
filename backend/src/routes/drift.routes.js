const express = require('express');
const router = express.Router();
const driftController = require('../controllers/drift.controller');

router.get('/:spillId', driftController.getDriftData);

module.exports = router;
