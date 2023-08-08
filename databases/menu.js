const sqlite3 = require("sqlite3").verbose()

const db = new sqlite3.Database('./databases/files/menu.db', (err) => {
    if (err) {
      console.error('Error connecting to the database:', err.message);
    } else {
      console.log("Successfully connected to menu database")
      db.run(
        `CREATE TABLE IF NOT EXISTS menu (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          image TEXT,
          category TEXT NOT NULL
        )`,
        (err) => {
          if (err) {
            console.error('Error creating table:', err.message);
          }
        }
      );
  
      // Create the 'categories' table
      db.run(
        `CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )`,
        (err) => {
          if (err) {
            console.error('Error creating categories table:', err.message);
          }
        }
      );
    }
  });

  module.exports = db