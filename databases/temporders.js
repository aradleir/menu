const mysql = require("mysql2");

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
    console.log('Successfully connected to the cashier\'s database.');
    
    // Create the orders1 table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS orders1 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT,
        price FLOAT,
        tableNumber BIGINT,
        category VARCHAR(255),
        status VARCHAR(255) DEFAULT 'Not sent',
        cashierName VARCHAR(255),
        note TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });

    // Create the kitchen_orders table if it doesn't exist
    db.query(`
      CREATE TABLE IF NOT EXISTS kitchen_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name TEXT,
        price FLOAT,
        tableNumber BIGINT,
        category VARCHAR(255),
        status VARCHAR(255) DEFAULT 'Not sent',
        cashierName VARCHAR(255),
        note TEXT,
        placement VARCHAR(255)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating kitchen_orders table:', err.message);
      }
    });

  
  }
});

module.exports = db;
