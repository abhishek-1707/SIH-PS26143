'use strict';

const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const directory = () => process.env.OSIS_REPORT_DIR || path.resolve(__dirname, '../../data/incidents');
const validId = id => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);
let active = 0;

function runPipeline(input) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.env.PYTHON_PATH || 'python',
            [path.resolve(__dirname, '../../scripts/incident_pipeline.py')],
            { windowsHide: true, shell: false, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
        let output = '', bytes = 0, settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            error ? reject(error) : resolve(value);
        };
        const timer = setTimeout(() => {
            child.kill();
            finish(Object.assign(new Error('Analysis exceeded the 60 second processing limit'), { status: 504 }));
        }, 60000);
        child.on('error', () => finish(Object.assign(
            new Error('Python unavailable. Install Python 3.10+ or set PYTHON_PATH.'), { status: 503 })));
        child.stdout.on('data', data => {
            bytes += data.length;
            if (bytes > 8 * 1024 * 1024) {
                child.kill();
                finish(new Error('Pipeline output exceeded safety limit'));
            } else output += data.toString();
        });
        // Do not echo arbitrary process output or credentials to API clients/logs.
        child.stderr.resume();
        child.stdin.on('error', () => { });
        child.on('close', code => {
            if (code !== 0) return finish(Object.assign(new Error('Scientific pipeline failed validation or processing'), { status: 422 }));
            try {
                const result = JSON.parse(output);
                if (!['completed', 'no_candidates'].includes(result.status)) throw new Error('Invalid pipeline output');
                finish(null, result);
            } catch {
                finish(new Error('Scientific pipeline returned invalid JSON'));
            }
        });
        child.stdin.end(JSON.stringify(input));
    });
}

async function save(report) {
    await fs.mkdir(directory(), { recursive: true });
    const destination = path.join(directory(), `${report.id}.json`);
    const temporary = `${destination}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(report), { flag: 'wx' });
    await fs.rename(temporary, destination);
}

async function analyze(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some(k => !['sceneId', 'forecastHours'].includes(k))) {
        throw Object.assign(new Error('Expected sceneId and forecastHours only'), { status: 400 });
    }
    const sceneId = input.sceneId ?? 'demo-arabian-sea';
    const forecastHours = input.forecastHours ?? 24;
    if (sceneId !== 'demo-arabian-sea') throw Object.assign(new Error('Unknown scene'), { status: 400 });
    if (![24, 48, 72].includes(forecastHours)) {
        throw Object.assign(new Error('forecastHours must be the number 24, 48 or 72'), { status: 400 });
    }
    if (active >= 2) throw Object.assign(new Error('Analysis capacity reached; retry shortly'), { status: 429 });
    active++;
    const id = randomUUID();
    console.info(`[incident ${id}] analysis started (${forecastHours}h, synthetic_demo)`);
    try {
        const result = await runPipeline({ sceneId, forecastHours });
        const report = {
            ...result, id, detectedAt: new Date().toISOString(),
            persistence: { local: 'durable_json', database: 'disabled' }
        };
        if (process.env.OSIS_PERSIST_POSTGRES === 'true' && report.spill) {
            try {
                const pool = require('../config/db');
                report.persistence.database = 'mirrored';
                await pool.query(
                    `INSERT INTO osis_incidents(id, detected_at, image_at, spill_geom, origin_geom, report)
           VALUES ($1,$2,$3,ST_SetSRID(ST_GeomFromGeoJSON($4),4326),
                   ST_SetSRID(ST_GeomFromGeoJSON($5),4326),$6::jsonb)`,
                    [id, report.detectedAt, report.scene.acquiredAt, JSON.stringify(report.spill.geometry),
                        JSON.stringify(report.origin.geometry), JSON.stringify(report)]);
            } catch {
                report.persistence.database = 'unavailable_local_fallback';
                console.warn(`[incident ${id}] database mirror unavailable; retaining local report`);
            }
        }
        await save(report);
        console.info(`[incident ${id}] ${report.status}; ${report.stages?.length || 0} stages`);
        return report;
    } finally {
        active--;
    }
}

async function get(id) {
    if (!validId(id)) throw Object.assign(new Error('Invalid incident ID'), { status: 400 });
    try {
        return JSON.parse(await fs.readFile(path.join(directory(), `${id}.json`), 'utf8'));
    } catch (error) {
        if (error.code === 'ENOENT') throw Object.assign(new Error('Incident not found'), { status: 404 });
        throw error;
    }
}

async function list() {
    let files;
    try { files = await fs.readdir(directory()); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
    const reports = [];
    for (const file of files.filter(f => f.endsWith('.json') && validId(f.slice(0, -5)))) {
        const r = await get(file.slice(0, -5));
        reports.push({
            id: r.id, detectedAt: r.detectedAt, sceneId: r.scene.id,
            acquiredAt: r.scene.acquiredAt, status: r.status, forecastHours: r.forecastHours,
            leadingCandidate: r.leadingCandidate, source: r.scene.source
        });
    }
    return reports.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

module.exports = { analyze, get, list };