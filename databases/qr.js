const mysql = require('mysql2');

const qrCodesDb = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT
});

qrCodesDb.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
  } else {
    console.log('Successfully connected to the QR database.');

   // Update the CREATE TABLE statement in your database code
   
   // Create the qrcodes table
   qrCodesDb.query(`
     CREATE TABLE IF NOT EXISTS qrcodes (
       id INT AUTO_INCREMENT PRIMARY KEY,
       qrData TEXT,
       tableNumber VARCHAR(255),
       tableNumberWithoutCode VARCHAR(255)
     )
   `, (err) => {
     if (err) {
       console.error('Error creating table:', err.message);
     }
   });


  }
});

module.exports = qrCodesDb;
