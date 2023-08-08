const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database('./databases/files/shift.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Successfully connected to the shift management database');
        createOrdersTable();
    }
});

function createOrdersTable() {
    // Create the orders table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS orders1 (
         
            price REAL
           
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });
}

module.exports = db;
