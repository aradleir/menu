const sqlite3 = require("sqlite3").verbose()
const db = new sqlite3.Database('./databases/files/temporders.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Successfully connected to the cashier\'s database.');
    }
  });
  
  // Create the temporders table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price REAL,
      tableNumber INTEGER,
      category TEXT,
      status TEXT DEFAULT 'Not sent',
      cashierName TEXT,
      note TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    }
  });

  module.exports = db