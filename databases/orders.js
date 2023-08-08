const sqlite3 = require('sqlite3').verbose();


const db = new sqlite3.Database('./databases/files/orders.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log("Successfully connected to orders database")
    db.run(
      'CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL, category TEXT, orderTime TEXT, cashier TEXT)',
      (err) => {
        if (err) {
          console.error('Error creating table:', err.message);
        } 
      }
    );
  }
});

module.exports = db;