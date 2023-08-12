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
    console.log("Successfully connected to orders database");

   createOrdersTable()
  }
});



function createOrdersTable() {
  db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT,
      price FLOAT,
      category VARCHAR(255),
      orderTime DATETIME,
      cashier VARCHAR(255)
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Error creating table:', createErr.message);
    } else {
      console.log('Orders table created successfully.');
    }
  });
}

module.exports = db;
