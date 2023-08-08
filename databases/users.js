const sqlite3 = require('sqlite3').verbose();
require("dotenv").config()
const db = new sqlite3.Database('./databases/files/users.db', (err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log("Successfully connected to the users database");
    // Create the 'users' table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        shift_status INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        // Check if the 'owner' user exists, if not, create it
        db.get('SELECT * FROM users WHERE username = ?', ['owner'], (err, row) => {
          if (err) {
            console.error('Error fetching user:', err.message);
          } else if (!row) {
            // Create the 'owner' user with the password 'test' and role 'admin'
            db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [process.env.ownerUsername, process.env.ownerPassword, 'admin'], (err) => {
              if (err) {
                console.error('Error creating user:', err.message);
              } else {
                console.log(`User ${process.env.ownerUsername} created successfully.`);
              }
            });
          }
        });
      }
    });
  }
});

module.exports = db;
