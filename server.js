const express = require('express');
const app = express();
const path = require('path');
const qr = require("qrcode")
const multer = require('multer');
const cors = require('cors');
require("dotenv").config()
// Connect to the SQL databases
const menuDatabase = require("./databases/menu")
const ordersDatabase = require('./databases/orders');
const usersDatabase = require("./databases/users")
const codesDatabase = require('./databases/codes');
const qrCodesDb = require("./databases/qr");
// Set up storage for image uploads using multer
const storage = multer.diskStorage({
  destination: './public/images',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(upload.single('itemImage')); // Specify the field name for the image file
app.use(express.json());
app.use(cors());


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu/menu.html'));
});




function generateRandomCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}


// Route for QR code generation
app.post('/api/generate-qr', (req, res) => {
  const { tableNumber } = req.body;
  const randomCode = generateRandomCode(5);
  const tableNumberWithCode = `${tableNumber}${randomCode}`;

  // Check if the table number without the code exists in the database

  qrCodesDb.get('SELECT * FROM qrcodes WHERE tableNumber = ?', [tableNumber], (err, row) => {
    if (err) {
      console.error('Error fetching QR code data:', err.message);
      return res.status(500).json({ error: 'Error fetching QR code data' });
    }
   
    if (row) {
      // If the table number without the code exists, reject the request
      return res.status(409).json({ error: 'Table number is already added' });
    }

    // Generate the QR code data with the table number
    const uri = process.env.websiteURI
  
    const qrData = `${uri}/menu/menu.html?Table=${tableNumberWithCode}`;
   

    // Generate the QR code image as a data URL
    qr.toDataURL(qrData, (err, qrDataURL) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return res.status(500).json({ error: 'Error generating QR code' });
      }

      // Save the QR code data and table number to the database
      qrCodesDb.run(`
        INSERT INTO qrcodes (qrData, tableNumber)
        VALUES (?, ?)
      `, [qrDataURL, tableNumberWithCode], (err) => {
        if (err) {
          console.error('Error saving QR code data:', err.message);
          return res.status(500).json({ error: 'Error saving QR code data' });
        }

        // Send the generated QR data URL back to the client
        res.json({ qrDataURL });
      });
    });
  });
});

app.delete('/api/delete-table/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;

  // Delete the table data from the qrcodes table
  const qrCodesDb = require("./databases/qr");
  qrCodesDb.run('DELETE FROM qrcodes WHERE tableNumber LIKE ?', [`%${tableNumber}%`], (err) => {
    if (err) {
      console.error('Error deleting table data from qrcodes:', err.message);
      return res.status(500).json({ error: 'Error deleting table data from qrcodes' });
    }

   

    // Now, delete all corresponding data from the temporders table
    const tempOrdersDb = require("./databases/temporders");
    tempOrdersDb.run('DELETE FROM orders WHERE tableNumber LIKE ?', [`%${tableNumber}%`], function (err) {
      if (err) {
        console.error('Error deleting table data from temporders:', err.message);
        return res.status(500).json({ error: 'Error deleting table data from temporders' });
      }

     

      // Retrieve all remaining rows from the orders table in temporders database and log them
      tempOrdersDb.all('SELECT * FROM orders', (err, rows) => {
        if (err) {
          console.error('Error retrieving data from temporders:', err.message);
          return res.status(500).json({ error: 'Error retrieving data from temporders' });
        }

      

        res.json({ message: `Table data for table number ${tableNumber} deleted successfully` });
      });
    });
  });
});

app.post('/add-to-menu', (req, res) => {
  const { itemName, itemPrice, itemCategory } = req.body;
  const price = parseFloat(itemPrice);
  const image = req.file ? '/images/' + req.file.filename : null;
 
  if (itemName && !isNaN(price) && itemCategory) {
    const sql = 'INSERT INTO menu (name, price, image, category) VALUES (?, ?, ?, ?)';
    menuDatabase.run(sql, [itemName, price, image, itemCategory], (err) => {
      if (err) {
        console.error('Error adding item to menu:', err.message);
        res.status(500).send('Error adding item to menu.');
      } else {
        res.redirect('/');
      }
    });
  } else {
    console.error('Invalid item name, price, or category.');
    res.status(400).send('Invalid item name, price, or category.');
  }
});

app.delete('/delete-item/:id', (req, res) => {
  const itemId = req.params.id;

  const deleteItemQuery = `
    DELETE FROM menu
    WHERE id = ?
  `;

  menuDatabase.run(deleteItemQuery, [itemId], function (err) {
    if (err) {
      console.error('Error deleting item from menu:', err);
      res.status(500).json({ error: 'Failed to delete item from menu' });
    } else {
      res.json({ success: true });
    }
  });
});


app.post('/add-category', (req, res) => {
  const { category } = req.body;

  if (category) {
    const sql = 'INSERT INTO categories (name) VALUES (?)';
    menuDatabase.run(sql, [category], (err) => {
      if (err) {
        console.error('Error adding category:', err.message);
        res.status(500).send('Error adding category.');
      } else {
        res.sendStatus(200);
      }
    });
  } else {
    console.error('Invalid category name.');
    res.status(400).send('Invalid category name.');
  }
});

app.get('/api/categories', (req, res) => {
  const sql = 'SELECT * FROM categories';
  menuDatabase.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error loading categories:', err.message);
      res.status(500).send('Error loading categories.');
    } else {
      res.json(rows);
    }
  });
});
app.post('/remove-item', (req, res) => {
  const categoryToRemoveFrom = req.body.categoryToRemove;
  const itemToRemove = req.body.itemToRemove;
  if (categoryToRemoveFrom && itemToRemove) {
    items = items.filter(
      (item) => item.category !== categoryToRemoveFrom || item.name !== itemToRemove
    );
    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

app.get('/api/menu', (req, res) => {
  const sql = 'SELECT * FROM menu';
  menuDatabase.all(sql, [], (err, rows) => {
      if (err) {
          console.error('Error loading menu:', err.message);
          res.status(500).send('Error loading menu.');
      } else {
          res.json(rows);
      }
  });
});


app.post('/remove-category', (req, res) => {
  const { category } = req.body;

  if (category) {
    const sql = 'DELETE FROM categories WHERE name = ?';
    menuDatabase.run(sql, [category], (err) => {
      if (err) {
        console.error('Error removing category:', err.message);
        res.status(500).send('Error removing category.');
      } else {
        // If a category is removed, also remove any menu items associated with that category
        const deleteMenuItemsSql = 'DELETE FROM menu WHERE category = ?';
        menuDatabase.run(deleteMenuItemsSql, [category], (err) => {
          if (err) {
            console.error('Error removing menu items for category:', err.message);
            res.status(500).send('Error removing menu items for category.');
          } else {
            res.sendStatus(200);
          }
        });
      }
    });
  } else {
    console.error('Invalid category name.');
    res.status(400).send('Invalid category name.');
  }
});


app.post('/submit-order', (req, res) => {
  const { name, price, category, cashier } = req.body;
  const orderTime = new Date().toLocaleString();

  const sql = 'INSERT INTO orders (name, price, category, orderTime, cashier) VALUES (?, ?, ?, ?, ?)';
  
  // Convert the 'price' value to a float using parseFloat
  const values = [name, parseFloat(price), category, orderTime, cashier];

  ordersDatabase.run(sql, values, (err) => {
    if (err) {
      console.error('Error inserting data:', err.message);
      res.status(500).json({ error: 'Error inserting data' });
    } else {
      res.sendStatus(200);
    }
  });
});

app.get('/api/orders', (req, res) => {
  const sql = 'SELECT name, price, category, orderTime, cashier FROM orders';

  ordersDatabase.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching orders:', err.message);
      res.status(500).json({ error: 'Error fetching orders' });
    } else {
      
      res.json(rows);
    }
  });
});




app.post('/api/users', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  const insertQuery = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
  const values = [username, password, role];

  usersDatabase.run(insertQuery, values, (err) => {
    if (err) {
      console.error('Error saving user to the database:', err.message);
      return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }

    console.log('User saved to the database:', username);
    return res.status(201).json({ message: 'User created successfully.' });
  });
});

// Fetch all users from the database
app.get('/api/users', (req, res) => {
  const sql = 'SELECT * FROM users';
  usersDatabase.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching users from the database:', err.message);
      res.status(500).json({ error: 'Failed to fetch users.' });
    } else {
      res.json(rows);
    }
  });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const deleteQuery = 'DELETE FROM users WHERE id = ?';
  usersDatabase.run(deleteQuery, [userId], (err) => {
    if (err) {
      console.error('Error deleting user:', err.message);
      res.status(500).json({ error: 'Error deleting user' });
    } else {
      console.log('User deleted successfully');
      res.sendStatus(200); // Success response
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  usersDatabase.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user' });
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate a new code and save it in the 'codes' table
    const code = codesDatabase.generateCode();
    codesDatabase.saveCode(code);

    // Send the code, username, and role of the user in the response
    res.json({ code, username: row.username, role: row.role });
  });
});
app.get('/api/codes/:code', (req, res) => {
  const code = req.params.code;

  // Check if the provided code exists in the codes database
  codesDatabase.getCodes((codesList) => {
    if (codesList.includes(code)) {
      // Code is valid, return a success response
      res.sendStatus(200);
    } else {
      // Code is invalid, return a not found response
      res.sendStatus(404);
    }
  });
});
// Dashboard endpoint
app.get(`/dashboard.html`, (req, res) => {

  const code = req.query.code;
  
  if (!code) {
    return res.status(401).send('Unauthorized. Please provide a valid code.');
  }

  // Check if the provided code exists in the codes database
  codesDatabase.getCodes((codesList) => {
   
   
    if (codesList.includes(code)) {
      // Code is valid, serve the dashboard.html
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
      // Code is invalid
      res.status(401).send('Unauthorized. Invalid code.');
    }
  });
});

app.get('/api/shift', (req, res) => {
  // Fetch all cashiers with an active shift
  usersDatabase.all('SELECT username FROM users WHERE shift_status = 1', (err, rows) => {
    if (err) {
      console.error('Error fetching active shifts:', err.message);
      return res.status(500).json({ error: 'Error fetching active shifts' });
    }

    const activeShifts = rows.map((row) => row.username);
    return res.json(activeShifts);
  });
});
// Get all users with the role 'cashier'
app.get('/api/cashiers', (req, res) => {
  usersDatabase.all('SELECT username FROM users WHERE role = "cashier"', (err, rows) => {
    if (err) {
      console.error('Error fetching cashiers:', err.message);
      return res.status(500).json({ error: 'Error fetching cashiers' });
    }

    const cashiers = rows.map((row) => ({ username: row.username }));
    
    return res.json(cashiers);

  });
});

// Start cashier's shift
app.post('/api/start-shift', (req, res) => {
  const { username } = req.body;

  // Check if there are any active shifts
  usersDatabase.get('SELECT COUNT(*) as count FROM users WHERE shift_status = 1', (err, row) => {
    if (err) {
      console.error('Error checking active shifts:', err.message);
      return res.status(500).json({ error: 'Error checking active shifts' });
    }

    const activeShiftCount = row.count;
    if (activeShiftCount > 0) {
      return res.status(400).json({ error: 'There is currently an active shift' });
    }

    // If no active shifts, update the shift_status for the cashier
    usersDatabase.run('UPDATE users SET shift_status = 1 WHERE username = ?', [username], (err) => {
      if (err) {
        console.error('Error starting shift:', err.message);
        return res.status(500).json({ error: 'Error starting shift' });
      }

      res.sendStatus(200);
    });
  });
});



app.post('/api/end-shift', (req, res) => {
  const { username } = req.body;

  usersDatabase.run('UPDATE users SET shift_status = 0 WHERE username = ?', [username], (err) => {
    if (err) {
      console.error('Error ending shift:', err.message);
      return res.status(500).json({ error: 'Error ending shift' });
    }

    // Delete all rows from the orders table in temporders database
    tempOrdersDb.run('DELETE FROM orders', (deleteErr) => {
      if (deleteErr) {
        console.error('Error deleting data from temporders:', deleteErr.message);
        return res.status(500).json({ error: 'Error deleting data from temporders' });
      }

      const db = require("./databases/shiftmanagement")
      db.run("DELETE FROM orders", (err) => {
        
      })

      console.log('All data in temporders table deleted successfully.');
      res.sendStatus(200);
    });
  });
});

app.post('/api/update-order-status', (req, res) => {
  const { orderId, status } = req.body;

  // Update the status of the order in the database
  const sql = `UPDATE orders SET status = ? WHERE id = ?`;
  tempOrdersDb.run(sql, [status, orderId], (err) => {
    if (err) {
      console.error('Error updating order status:', err.message);
      return res.status(500).json({ error: 'Error updating order status' });
    }

    res.json({ message: 'Order status updated successfully' });
  });
});







// End cashier's shift
app.get('/api/check-shift-status/:username', (req, res) => {
  const username = req.params.username;

  // Check if the provided username exists in the users database
  usersDatabase.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user' });
    }

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Assume the 'shift_status' column is boolean and indicates if the shift is active
    // This value can be stored in the 'users' table or a separate 'shifts' table associated with the user
    const shiftStatus = row.shift_status === 1;
  

    return res.json({ shiftStatus });
  });
});

// Check shift status for a specific user
app.get('/api/check-shift-status/:username', (req, res) => {
  const { username } = req.params;
  usersDatabase.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    const shiftStatus = row.shift_status === 1;
    res.json(shiftStatus);
  });
});
const tempOrdersDb = require("./databases/temporders");



app.post('/api/submit-order', (req, res) => {

  const { name, price, category, tableNumber, username, cashierName, note } = req.body;
  
  const sql = `
    INSERT INTO orders (name, price, category, tableNumber, status, cashierName, note)
    VALUES (?, ?, ?, ?, "Not sent", ?, ?)
  `;
  
  tempOrdersDb.run(sql, [name, price, category, tableNumber, cashierName, note], function (err) {
    if (err) {
      console.error('Error inserting order into the database:', err.message);
      return res.status(500).json({ error: 'Error inserting order into the database' });
    }

    const shiftDb = require("./databases/shiftmanagement")
    const shiftsql = `
      INSERT INTO orders (price)
      VALUES (?)
    `;
    
    shiftDb.run(shiftsql, [price], function (shiftErr) {
      if (shiftErr) {
        console.error('Error inserting order into the shift database:', shiftErr.message);
        return res.status(500).json({ error: 'Error inserting order into the shift database' });
      }
      
      res.json({ message: 'Order submitted successfully' });
    });
  });
});

// API endpoint for retrieving all orders
app.get('/get-orders', (req, res) => {
  // Fetch all orders from the temporders table
  tempOrdersDb.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      console.error('Error fetching orders:', err.message);
      return res.status(500).json({ error: 'Error fetching orders from the database.' });
    }
    
    res.json(rows);
   
    
   
    
  
  });
});

app.get("/get-shift-orders", (req,res) => {
  const shiftDB = require("./databases/shiftmanagement")
  shiftDB.all('SELECT * FROM orders', (err, rows) => {
    if (err) {
      console.error('Error inserting order into the database:', err.message);
      return res.status(500).json({ error: 'Error inserting order into the database' });
    }
    res.json(rows)
    
  })
})

app.get('/api/get-table-numbers', (req, res) => {
  qrCodesDb.all('SELECT tableNumber FROM qrcodes', (err, rows) => {
    if (err) {
      console.error('Error fetching table numbers:', err.message);
      return res.status(500).json({ error: 'Error fetching table numbers' });
    }

    const tableNumbers = rows.map((row) => row.tableNumber);
    res.json({ tableNumbers });
  
  });
});


app.post('/update-order-status', (req, res) => {
  const { id, status } = req.body;
  // Assuming you have already set up the database connection (db) and orders table
  tempOrdersDb.run('UPDATE orders SET status = ? WHERE id = ?', [status, id], (err) => {
    if (err) {
      console.error('Error updating order status:', err.message);
      res.status(500).json({ error: 'Error updating order status' });
    } else {
     
      res.status(200).json({ success: true });
    }
  });
});
// Server-side code


app.get('/api/get-orders/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;
  const tempOrdersDb = require("./databases/temporders");

  // Retrieve all orders for the given table number from the temporders database
  tempOrdersDb.all('SELECT * FROM orders WHERE tableNumber LIKE ?', [`%${tableNumber}%`], (err, rows) => {
    if (err) {
      console.error('Error retrieving orders from temporders:', err.message);
      return res.status(500).json({ error: 'Error retrieving orders from temporders' });
    }

    // Check if any orders were found
    if (rows.length === 0) {
      return res.json({ orders: [] }); // Return an empty array to indicate no orders found
    }

    // Send the orders data back to the client
    res.json({ orders: rows });
   
  });
});
// Route to delete all orders for a specific table number
app.delete('/api/delete-all-orders/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;

  // Delete all orders for the given table number from the temporders database
  tempOrdersDb.run('DELETE FROM orders WHERE tableNumber = ?', [tableNumber], (err) => {
    if (err) {
      console.error('Error deleting orders from temporders:', err.message);
      return res.status(500).json({ error: 'Error deleting orders from temporders' });
    }

    console.log('All orders for table number', tableNumber, 'deleted successfully from temporders');

    res.json({ message: `All orders for table number ${tableNumber} deleted successfully` });
  });
});
// Define a route to send environment variables as JSON
app.get('/api/env', (req, res) => {
  res.json({
    currency: process.env.currency,

  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu/menu.html'));
});
// Start the server
const port = process.env.port;
app.listen(port, () => {
 console.log(`Successfully connected to port on ${process.env.websiteURI}`)
});