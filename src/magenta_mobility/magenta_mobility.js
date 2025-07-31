const querystring = require('querystring');
const moment = require('moment-timezone');
const { google } = require('googleapis');
const { Pool } = require('pg');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: "postgres",
    host: 'db.mgampbhmlnalxohuobpr.supabase.co',
    database: "postgres",
    password: 'gplVhDuxLDMeBKxs',
    port: 5432,
});

// Logger Intialize
const logger = require('./magenta_mobility_logger');