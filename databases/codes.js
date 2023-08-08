const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./databases/files/codes.db');

// Create the 'codes' table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS codes (
    code TEXT PRIMARY KEY
  )
`);

// Function to get all codes from the 'codes' table
function getCodes(callback) {
  const sql = 'SELECT code FROM codes';
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching codes from the database:', err.message);
      return callback([]);
    }
    const codes = rows.map((row) => row.code);
   
    callback(codes);
  });
}



// Function to generate a random code and save it to the 'codes' table
function generateCode() {
  const code = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a random 4-digit code
  saveCode(code);
  return code;
}

// Function to save a code to the 'codes' table
function saveCode(code) {
  const insertQuery = `INSERT OR IGNORE INTO codes (code) VALUES (?)`;
  db.run(insertQuery, [code], (err) => {
    if (err) {
      console.error('Error saving code to the database:', err.message);
    }
  });
}

module.exports = {
  getCodes,
  generateCode,
  saveCode,
};
