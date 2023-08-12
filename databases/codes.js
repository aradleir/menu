const mysql = require('mysql2');
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Successfully connected to the codes database');
   // Create the 'codes' table if it doesn't exist
// Create the 'codes' table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS codes (
    code VARCHAR(4) PRIMARY KEY,
    UNIQUE (code)
  )
`, (err) => {
  if (err) {
    console.error('Error creating codes table:', err.message);
  }
});

  }
});

// Function to get all codes from the 'codes' table
function getCodes(callback) {
  const sql = 'SELECT code FROM codes';
  db.query(sql, (err, rows) => {
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
  const insertQuery = `INSERT IGNORE INTO codes (code) VALUES (?)`;
  db.query(insertQuery, [code], (err) => {
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
