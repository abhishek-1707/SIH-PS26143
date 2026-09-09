'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../src/config/db');

async function migrate() {
    const name = process.argv[2] || '002_incidents.sql';
    if (!['001_hindcast_schema.sql', '002_incidents.sql'].includes(name)) {
        throw new Error('Unsupported migration name');
    }
    const sql = await fs.readFile(path.resolve(__dirname, '../migrations', name), 'utf8');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log(`Applied ${name}`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
migrate().catch(error => {
    console.error(`Migration failed (${error.code || 'configuration'}). Check database availability and prerequisites.`);
    process.exitCode = 1;
}).finally(() => pool.end());