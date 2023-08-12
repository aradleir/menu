const mysql = require('mysql2');
require("dotenv").config();

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
    console.log("Successfully connected to the users database");
    // Create the 'users' table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        shift_status INT DEFAULT 0
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        // Check if the 'owner' user exists, if not, create it
        db.query('SELECT * FROM users WHERE username = ?', ['owner'], (err, results) => {
          if (err) {
            console.error('Error fetching user:', err.message);
          } else if (results.length === 0) {
            // Create the 'owner' user with the password 'test' and role 'admin'
            db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [process.env.ownerUsername, process.env.ownerPassword, 'admin'], (err) => {
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
