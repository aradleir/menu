const express = require('express');
const app = express();
const path = require('path');
const qr = require("qrcode")
const multer = require('multer');
const cors = require('cors');
require("dotenv").config()

const menuDatabase = require("./databases/menu")
const ordersDatabase = require('./databases/orders');
const usersDatabase = require("./databases/users")
const codesDatabase = require('./databases/codes');
const qrCodesDb = require("./databases/qr");
const tempOrdersDb = require("./databases/temporders")
const shiftDb = require("./databases/shiftmanagement");
const { table } = require('console');
const storage = multer.diskStorage({
  destination: './public/images',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(upload.single('itemImage'));
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

app.post('/api/generate-qr', (req, res) => {
  const { tableNumber } = req.body;
  const randomCode = generateRandomCode(5);
  const tableNumberWithCode = `${tableNumber}${randomCode}`;

  // Check if the table number without the code exists in the database
  const sql = 'SELECT * FROM qrcodes WHERE tableNumber = ?';
  qrCodesDb.query(sql, [tableNumber], (err, row) => {
    if (err) {
      console.error('Error fetching QR code data:', err.message);
      return res.status(500).json({ error: 'Error fetching QR code data' });
    }

    if (row.length > 0) {
      // If the table number without the code exists, reject the request
      return res.status(409).json({ error: 'Table number is already added' });
    }

    // Generate the QR code data with the table number
    const uri = process.env.websiteURI;
    const qrData = `${uri}/menu/menu.html?Table=${tableNumberWithCode}`;

    // Generate the QR code image as a data URL
    qr.toDataURL(qrData, (err, qrDataURL) => {
      if (err) {
        console.error('Error generating QR code:', err);
        return res.status(500).json({ error: 'Error generating QR code' });
      }

      // Save the QR code data and table number to the database
      const insertSql = 'INSERT INTO qrcodes (qrData, tableNumber) VALUES (?, ?)';
      qrCodesDb.query(insertSql, [qrDataURL, tableNumberWithCode], (err) => {
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

  qrCodesDb.query('DELETE FROM qrcodes WHERE tableNumber LIKE ?', [`%${tableNumber}%`], (err) => {
    if (err) {
      console.error('Error deleting table data from qrcodes:', err.message);
      return res.status(500).json({ error: 'Error deleting table data from qrcodes' });
    }

    const tempOrdersDb = require("./databases/temporders");
    tempOrdersDb.query('DELETE FROM orders1 WHERE tableNumber LIKE ?', [`%${tableNumber}%`], (err) => {
      if (err) {
        console.error('Error deleting table data from temporders:', err.message);
        return res.status(500).json({ error: 'Error deleting table data from temporders' });
      }

      tempOrdersDb.query('SELECT * FROM orders1', (err, rows) => {
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
  const { itemName, itemPrice, itemCategory, itemPlacement, itemTime } = req.body;
  const price = parseFloat(itemPrice);
  const image = req.file ? '/images/' + req.file.filename : null;

  if (itemName && !isNaN(price) && itemCategory) {
    const sql = 'INSERT INTO menu (name, price, image, category, placement, out_of_stock, time) VALUES (?, ?, ?, ?, ?, ?, ?)';
    menuDatabase.query(sql, [itemName, price, image, itemCategory, itemPlacement, 2, itemTime], (err) => {
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

  const deleteItemQuery = 'DELETE FROM menu WHERE id = ?';

  menuDatabase.query(deleteItemQuery, [itemId], (err) => {
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
    menuDatabase.query(sql, [category], (err) => {
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
  menuDatabase.query(sql, [], (err, rows) => {
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
  menuDatabase.query(sql, [], (err, rows) => {
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
    menuDatabase.query(sql, [category], (err) => {
      if (err) {
        console.error('Error removing category:', err.message);
        res.status(500).send('Error removing category.');
      } else {
        const deleteMenuItemsSql = 'DELETE FROM menu WHERE category = ?';
        menuDatabase.query(deleteMenuItemsSql, [category], (err) => {
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
  const orderTime = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const sql = 'INSERT INTO orders (name, price, category, orderTime, cashier) VALUES (?, ?, ?, ?, ?)';
  const values = [name, parseFloat(price), category, orderTime, cashier];

  ordersDatabase.query(sql, values, (err) => {
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
  ordersDatabase.query(sql, [], (err, rows) => {
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

  usersDatabase.query(insertQuery, values, (err) => {
    if (err) {
      console.error('Error saving user to the database:', err.message);
      return res.status(500).json({ error: 'Internal server error. Please try again later.' });
    }

    console.log('User saved to the database:', username);
    return res.status(201).json({ message: 'User created successfully.' });
  });
});

app.get('/api/users', (req, res) => {
  const sql = 'SELECT * FROM users';
  usersDatabase.query(sql, [], (err, rows) => {
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
  usersDatabase.query(deleteQuery, [userId], (err) => {
    if (err) {
      console.error('Error deleting user:', err.message);
      res.status(500).json({ error: 'Error deleting user' });
    } else {
      console.log('User deleted successfully');
      res.sendStatus(200);
    }
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  usersDatabase.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, rows) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user' });
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const code = codesDatabase.generateCode();
    codesDatabase.saveCode(code);

    res.json({ code, username: rows[0].username, role: rows[0].role });
  });
});

app.get('/api/codes/:code', (req, res) => {
  const code = req.params.code;

  codesDatabase.getCodes((codesList) => {
    if (codesList.includes(code)) {
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });
});

app.get(`/dashboard.html`, (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.status(401).send('Unauthorized. Please provide a valid code.');
  }

  codesDatabase.getCodes((codesList) => {
    if (codesList.includes(code)) {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
      res.status(401).send('Unauthorized. Invalid code.');
    }
  });
});

app.get('/api/shift', (req, res) => {
  usersDatabase.query('SELECT username FROM users WHERE shift_status = 1', (err, rows) => {
    if (err) {
      console.error('Error fetching active shifts:', err.message);
      return res.status(500).json({ error: 'Error fetching active shifts' });
    }

    const activeShifts = rows.map((row) => row.username);
    return res.json(activeShifts);
  });
});

app.get('/api/cashiers', (req, res) => {
  usersDatabase.query('SELECT username FROM users WHERE role = "cashier"', (err, rows) => {
    if (err) {
      console.error('Error fetching cashiers:', err.message);
      return res.status(500).json({ error: 'Error fetching cashiers' });
    }

    const cashiers = rows.map((row) => ({ username: row.username }));
    return res.json(cashiers);
  });
});

app.post('/api/start-shift', (req, res) => {
  const { username } = req.body;

  usersDatabase.query('SELECT COUNT(*) as count FROM users WHERE shift_status = 1', (err, rows) => {
    if (err) {
      console.error('Error checking active shifts:', err.message);
      return res.status(500).json({ error: 'Error checking active shifts' });
    }

    const activeShiftCount = rows[0].count;
    if (activeShiftCount > 0) {
      return res.status(400).json({ error: 'There is currently an active shift' });
    }

    usersDatabase.query('UPDATE users SET shift_status = 1 WHERE username = ?', [username], (err) => {
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

  usersDatabase.query('UPDATE users SET shift_status = 0 WHERE username = ?', [username], (err) => {
    if (err) {
      console.error('Error ending shift:', err.message);
      return res.status(500).json({ error: 'Error ending shift' });
    }

    // Delete orders with status "Sent to customer" from orders1 and kitchen_orders tables
    const deleteQuery = `DELETE FROM orders1 WHERE status = ?`;
    const deleteValues = ['Sent to customer'];

    tempOrdersDb.query(deleteQuery, deleteValues, (deleteErr) => {
      if (deleteErr) {
        console.error('Error deleting data from orders1:', deleteErr.message);
        return res.status(500).json({ error: 'Error deleting data from orders1' });
      }

      // Also delete from kitchen_orders table
      const deleteKitchenQuery = `DELETE FROM kitchen_orders WHERE status = ?`;
      tempOrdersDb.query(deleteKitchenQuery, deleteValues, (deleteKitchenErr) => {
        if (deleteKitchenErr) {
          console.error('Error deleting data from kitchen_orders:', deleteKitchenErr.message);
          return res.status(500).json({ error: 'Error deleting data from kitchen_orders' });
        }

        console.log('Orders with status "Sent to customer" deleted successfully.');

        // Delete the orders11 table from the shiftDb
        const deleteOrders11Query = `DROP TABLE IF EXISTS orders11`;
        shiftDb.query(deleteOrders11Query, (deleteOrders11Err) => {
          if (deleteOrders11Err) {
            console.error('Error deleting table orders11:', deleteOrders11Err.message);
            return res.status(500).json({ error: 'Error deleting table orders11' });
          }

          console.log('Table orders11 deleted successfully.');
          res.sendStatus(200);
        });
      });
    });
  });
});



app.get('/api/check-shift-status/:username', (req, res) => {
  const username = req.params.username;

  usersDatabase.query('SELECT * FROM users WHERE username = ?', [username], (err, rows) => {
    if (err) {
      console.error('Error fetching user:', err.message);
      return res.status(500).json({ error: 'Error fetching user' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const shiftStatus = rows[0].shift_status === 1;
    return res.json({ shiftStatus });
  });
});

app.get('/api/get-orders/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;

  tempOrdersDb.query('SELECT * FROM orders1 WHERE tableNumber LIKE ?', [`%${tableNumber}%`], (err, rows) => {
    if (err) {
      console.error('Error retrieving orders from temporders:', err.message);
      return res.status(500).json({ error: 'Error retrieving orders from temporders' });
    }

    if (rows.length === 0) {
      return res.json({ orders: [] });
    }

    res.json({ orders: rows });
  });
});

app.delete('/api/delete-all-orders/:tableNumber', (req, res) => {
  const { tableNumber } = req.params;

  tempOrdersDb.query('DELETE FROM orders1 WHERE tableNumber = ?', [tableNumber], (err) => {
    if (err) {
      console.error('Error deleting orders from temporders:', err.message);
      return res.status(500).json({ error: 'Error deleting orders from temporders' });
    }

    console.log('All orders for table number', tableNumber, 'deleted successfully from temporders');

    res.json({ message: `All orders for table number ${tableNumber} deleted successfully` });
  });
});

app.get('/api/env', (req, res) => {
  res.json({
    currency: process.env.currency,
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'menu/menu.html'));
});



app.get('/api/get-table-numbers', (req, res) => {
  const sql = 'SELECT tableNumber FROM qrcodes';
  
  qrCodesDb.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching table numbers:', err.message);
      return res.status(500).json({ error: 'Error fetching table numbers' });
    }

    const tableNumbers = results.map((row) => row.tableNumber);
    res.json({ tableNumbers });
  });
});

app.post('/api/submit-order', (req, res) => {
  const { name, price, category, tableNumber, username, cashierName, note } = req.body;

  // Double-check the tableNumber data
  const parsedTableNumber = parseInt(tableNumber);
  if (isNaN(parsedTableNumber)) {
    return res.status(400).json({ error: 'Invalid tableNumber format' });
  }

  const sql = `
    INSERT INTO orders1 (name, price, category, tableNumber, status, cashierName, note)
    VALUES (?, ?, ?, ?, "Not sent", ?, ?)
  `;

  tempOrdersDb.execute(sql, [name, price, category, parsedTableNumber, cashierName, note], (err, results) => {
    if (err) {
      console.error('Error inserting order into the database:', err.message);
      return res.status(500).json({ error: 'Error inserting order into the database' });
    }

    const shiftsql = `
    INSERT INTO orders11 (name, price, category, tableNumber, cashierName, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    shiftDb.execute(shiftsql, [name, price, category, parsedTableNumber, cashierName, note], (shiftErr, shiftResults) => {
      if (shiftErr) {
        console.error('Error inserting order into the shift database:', shiftErr.message);
        return res.status(500).json({ error: 'Error inserting order into the shift database' });
      }

     

      res.json({ message: 'Order submitted successfully' });
    });
  });
});

app.get('/get-orders', (req, res) => {
  const sql = 'SELECT * FROM orders1';

  tempOrdersDb.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err.message);
      return res.status(500).json({ error: 'Error fetching orders' });
    }

    res.json(results);
    
   
  });
});

app.get("/get-shift-orders", (req, res) => {
 

 shiftDb.query('SELECT * FROM orders11', (err, results) => {
    if (err) {
     
      console.error('Error fetching shift orders:', err.message);
      return res.status(500).json({ error: 'Error fetching shift orders' });
      
    }
    
    res.json(results);
  });
});
app.get('/api/get-orders-by-placement/:placement', (req, res) => {
  const { placement } = req.params;

  tempOrdersDb.query('SELECT * FROM kitchen_orders WHERE placement = ?', [placement], (err, results) => {
    if (err) {
      console.error('Error fetching orders by placement:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results);
  });
});

// Endpoint to get all orders
app.get('/api/get-all-orders', (req, res) => {
  tempOrdersDb.query('SELECT * FROM kitchen_orders', (err, results) => {
    if (err) {
      console.error('Error fetching all orders:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.json(results);
   
  });
});
app.get('/api/send-to-restaurant', (req, res) => {
  const itemId = req.query.itemId;

  // Retrieve the item's file placement based on itemId from the menu database
  const getMenuQuery = 'SELECT placement FROM menu WHERE id = ?';
  menuDatabase.query(getMenuQuery, [itemId], (err, results) => {
    if (err) {
      console.error('Error fetching item placement:', err.message);
      res.status(500).json({ success: false, message: 'Error fetching item placement' });
    } else {
      const placement = results[0].placement;
      res.json({ success: true, message: 'Order sent to restaurant', placement });
    }
  });
});

app.post('/api/get-file-placement', (req, res) => {
  const itemName = req.body.itemName;

  menuDatabase.query(
    'SELECT placement FROM menu WHERE name = ?',
    [itemName],
    (err, results) => {
      if (err) {
        console.error('Error fetching file placement:', err);
        res.status(500).json({ message: 'Error fetching file placement' });
      } else {
        if (results.length > 0) {
          const placement = results[0].placement;
          res.json({ placement });
        } else {
          res.status(404).json({ message: 'Item not found in the menu' });
        }
      }
    }
  );
});

app.post('/api/send-order-to-kitchen', (req, res) => {
  const { name, price, tableNumber, category, note, placement } = req.body;

  // Insert a new order into the database
  const insertQuery = `
    INSERT INTO kitchen_orders (name, price, tableNumber, placement, category, note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [name, price, tableNumber, placement, category, note, 'Sent to kitchen'];

  tempOrdersDb.query(insertQuery, values, (err, results) => {
    if (err) {
      console.error('Error inserting order:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json({ message: 'Order sent to kitchen successfully' });
  });
});




app.get('/api/get-file-placements', (req, res) => {
  menuDatabase.query('SELECT DISTINCT placement FROM menu', (err, results) => {
    if (err) {
      console.error('Error fetching file placements:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
    const filePlacements = results.map((row) => row.placement);
    res.json({ filePlacements });
  });
});




app.post('/api/update-order-status', (req, res) => {
  const { id, newStatus } = req.body;


  // Update the order status in the database
  const query = `UPDATE orders1 SET status = ? WHERE id = ?`;
  const query1 = `UPDATE kitchen_orders SET status = ? WHERE id = ?`;

  tempOrdersDb.query(query, [newStatus, id], (error, results) => {
    if (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Error updating order status' });
      return
    } else {
   
     
    }
  });

  tempOrdersDb.query(query1, [newStatus, id], (error, results) => {
    if (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Error updating order status' });
      return
    } else {
     
      
    }
  });
  res.json({ message: 'Order status updated successfully' });
});

app.post('/api/delete-order', (req, res) => {
  const { id } = req.body;

  tempOrdersDb.query('DELETE FROM kitchen_orders WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error deleting order:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }

   
  });
  tempOrdersDb.query('DELETE FROM orders1 WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Error deleting order:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }

   
  });
  res.json({ message: 'Order deleted successfully' });
});


app.post('/api/toggle-stock/:itemId/:status', (req, res) => {
  const itemId = req.params.itemId;
  const newStatus = req.params.status;

  menuDatabase.query('UPDATE menu SET out_of_stock = ? WHERE id = ?', [newStatus, itemId], (err) => {
    if (err) {
      console.error('Error updating stock status:', err.message);
      return res.status(500).json({ error: 'Error updating stock status' });
    }

   
    res.json({ success: true });
  });
});
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(process.env.not_so_secret_code)
});
