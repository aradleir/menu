const mysql = require('mysql2');

// Create a database connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Successfully connected to menu database');
    // Create the 'menu' table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS menu (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price FLOAT NOT NULL,
        image TEXT,
        category VARCHAR(255) NOT NULL,
        placement VARCHAR(255),
        out_of_stock FLOAT NOT NULL,
        time VARCHAR(255) NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating menu table:', err.message);
      }
    });
    
    // Create the 'categories' table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating categories table:', err.message);
      }
    });
  }
});

module.exports = db;
