require('dotenv').config();
const knex = require('./db/knex');

async function test() {
  try {
    const users = await knex('etalovers').select('eid', 'firebase_id', 'installation_id', 'name');
    console.log("Users:", users);
  } catch (e) {
    console.error(e);
  } finally {
    knex.destroy();
  }
}
test();
