const sqlite3 = require("sqlite3").verbose();
const qrCodesDb = new sqlite3.Database('./databases/files/qrcodes.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Successfully connected to the QR database.');
  }
});

// Create the qrcodes table if it doesn't exist
qrCodesDb.run(`
  CREATE TABLE IF NOT EXISTS qrcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qrData TEXT,
    tableNumber INTEGER
  )
`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  }
});

module.exports = qrCodesDb;