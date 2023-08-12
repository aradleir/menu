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
    console.log('Successfully connected to the shift management database');
    createOrdersTable();
  }
});

function createOrdersTable() {
  // Create the orders table if it doesn't exist
  db.query(`
    CREATE TABLE IF NOT EXISTS orders11 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT,
      price FLOAT,
      tableNumber BIGINT,  -- Change data type to BIGINT
      category VARCHAR(255),
      cashierName VARCHAR(255),
      note TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating table:', err.message);
    }
  });
}

module.exports = db;
