require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version for async/await
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;

// --- MySQL Connection Pool Setup ---
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test MySQL connection
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL database!');
        connection.release(); // Release the connection immediately
    })
    .catch(err => {
        console.error('Failed to connect to MySQL database:', err.message);
        process.exit(1); // Exit process if database connection fails
    });

// --- Express Middleware ---
app.use(express.json()); // For parsing application/json

// --- Authentication Middleware ---

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required' });
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user; // Attach user/admin payload to request
        next();
    });
};

// Middleware to authorize only admins
const authorizeAdmin = (req, res, next) => {
    // req.user contains { id, role, type } from the JWT payload
    if (!req.user || req.user.role !== 'admin' || req.user.type !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};

// --- API Routes ---

// Base route for server check
app.get('/', (req, res) => {
    res.status(200).send('Inventory Management API Server Connected!');
});

// New route to indicate API base is working
app.get('/api', (req, res) => {
    res.status(200).json({ message: 'Inventory Management API is ready!' });
});

// New route to indicate AUTH base is working
app.get('/api/auth', (req, res) => {
    res.status(200).json({ message: 'Inventory Management AUTH is ready!' });
});

// --- Auth Routes ---
app.post('/api/auth/register/:type', async (req, res) => {
    const { username, email, password } = req.body;
    const type = req.params.type; // 'user' or 'admin'

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        let sql, params;

        if (type === 'user') {
            // Check if user already exists
            const [existingUsers] = await pool.execute('SELECT user_id FROM Users WHERE username = ? OR email = ?', [username, email]);
            if (existingUsers.length > 0) {
                return res.status(409).json({ message: 'User with this username or email already exists' });
            }
            sql = 'INSERT INTO Users (username, email, password_hash) VALUES (?, ?, ?)';
            params = [username, email, hashedPassword];
        } else if (type === 'admin') {
            // Check if admin already exists
            const [existingAdmins] = await pool.execute('SELECT admin_id FROM Admins WHERE username = ? OR email = ?', [username, email]);
            if (existingAdmins.length > 0) {
                return res.status(409).json({ message: 'Admin with this username or email already exists' });
            }
            sql = 'INSERT INTO Admins (username, email, password_hash) VALUES (?, ?, ?)';
            params = [username, email, hashedPassword];
        } else {
            return res.status(400).json({ message: 'Invalid registration type. Must be "user" or "admin".' });
        }

        const [result] = await pool.execute(sql, params);
        const newId = result.insertId; // Get the auto-incremented ID

        const payload = {
            id: newId,
            role: type,
            type: type
        };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        res.status(201).json({
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} registered successfully`,
            [`${type}Id`]: newId,
            token,
            role: type
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        let foundUser, userType;

        // Try to find in Users collection
        const [users] = await pool.execute('SELECT user_id AS id, password_hash FROM Users WHERE email = ?', [email]);
        if (users.length > 0) {
            foundUser = users[0];
            userType = 'user';
        } else {
            // If not found in Users, try Admins collection
            const [admins] = await pool.execute('SELECT admin_id AS id, password_hash FROM Admins WHERE email = ?', [email]);
            if (admins.length > 0) {
                foundUser = admins[0];
                userType = 'admin';
            }
        }

        if (!foundUser) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            id: foundUser.id,
            role: userType,
            type: userType
        };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            [`${userType}Id`]: foundUser.id,
            token,
            role: userType
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// --- User Account Management Routes (Admin Only) ---
app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const [users] = await pool.execute('SELECT user_id, username, email, created_at, updated_at FROM Users');
        res.status(200).json({ message: 'Users retrieved successfully', users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Failed to retrieve users' });
    }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const userId = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Start transaction

        // 1. Delete all orders placed by this user
        await connection.execute('DELETE FROM Order_Items WHERE order_id IN (SELECT order_id FROM Orders WHERE user_id = ?)', [userId]);
        const [deletedOrdersResult] = await connection.execute('DELETE FROM Orders WHERE user_id = ?', [userId]);
        console.log(`Deleted ${deletedOrdersResult.affectedRows} orders for user ${userId}.`);

        // 2. Delete the user account
        const [deletedUserResult] = await connection.execute('DELETE FROM Users WHERE user_id = ?', [userId]);

        if (deletedUserResult.affectedRows === 0) {
            await connection.rollback(); // Rollback if user not found
            return res.status(404).json({ message: 'User not found' });
        }

        await connection.commit(); // Commit transaction
        res.status(200).json({ message: 'User and associated orders deleted successfully' });
    } catch (error) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    } finally {
        if (connection) connection.release();
    }
});


// --- Admin Account Management Routes (Admin Only) ---
app.get('/api/admins', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const [admins] = await pool.execute('SELECT admin_id, username, email, created_at, updated_at FROM Admins');
        res.status(200).json({ message: 'Admins retrieved successfully', admins });
    } catch (error) {
        console.error('Error getting admins:', error);
        res.status(500).json({ message: 'Failed to retrieve admins' });
    }
});

app.delete('/api/admins/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const adminId = req.params.id;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Start transaction

        // Prevent an admin from deleting themselves if they are the only admin left
        const [adminCountResult] = await connection.execute('SELECT COUNT(*) AS count FROM Admins');
        const adminCount = adminCountResult[0].count;
        if (adminCount === 1 && req.user.id == adminId) { // Use == for number-string comparison from JWT
             await connection.rollback();
             return res.status(400).json({ message: 'Cannot delete the last remaining admin account.' });
        }

        // 1. Update orders approved by this admin: set approved_by to NULL
        const [updatedOrdersResult] = await connection.execute(
            'UPDATE Orders SET approved_by = NULL, approved_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE approved_by = ?',
            [adminId]
        );
        console.log(`Unset approved_by for ${updatedOrdersResult.affectedRows} orders approved by admin ${adminId}.`);

        // 2. Update items created by this admin: set created_by to NULL
        // Note: SQL schema uses ON DELETE RESTRICT for fk_item_creator,
        // so to physically delete the admin, you must either reassign items or make created_by nullable.
        // Therefore, we'll unset (set to NULL), but the schema needs to be compatible.
        // If created_by is NOT NULL, this will fail unless you reassign items.
        const [updatedItemsResult] = await connection.execute(
            'UPDATE Items SET created_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE created_by = ?',
            [adminId]
        );
        console.log(`Unset created_by for ${updatedItemsResult.affectedRows} items created by admin ${adminId}.`);


        // 3. Delete the admin account
        const [deletedAdminResult] = await connection.execute('DELETE FROM Admins WHERE admin_id = ?', [adminId]);

        if (deletedAdminResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Admin not found' });
        }

        await connection.commit(); // Commit transaction
        res.status(200).json({ message: 'Admin account and associated references updated/deleted successfully' });
    } catch (error) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error('Error deleting admin:', error);
        res.status(500).json({ message: 'Failed to delete admin' });
    } finally {
        if (connection) connection.release();
    }
});


// --- Category Routes ---
// Note: Create Category (Admin Only). Getting categories is public.
app.post('/api/categories', authenticateToken, authorizeAdmin, async (req, res) => {
    const { categoryName, description } = req.body;
    if (!categoryName) {
        return res.status(400).json({ message: 'Category name is required' });
    }
    try {
        const [result] = await pool.execute(
            'INSERT INTO Categories (category_name, description) VALUES (?, ?)',
            [categoryName, description]
        );
        res.status(201).json({
            message: 'Category created successfully',
            category: { category_id: result.insertId, category_name: categoryName, description }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') { // MySQL duplicate entry error code
            return res.status(409).json({ message: 'Category name already exists' });
        }
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Failed to create category' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const [categories] = await pool.execute('SELECT * FROM Categories');
        res.status(200).json({ message: 'Categories retrieved successfully', categories });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ message: 'Failed to retrieve categories' });
    }
});


// --- Item Routes ---

// Create Item (Admin Only)
app.post('/api/items', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name, price, size, categoryId, stockQuantity, description, imageUrl } = req.body;

    if (!name || !price || !size || !categoryId) {
        return res.status(400).json({ message: 'Name, price, size, and categoryId are required.' });
    }
    if (!['small', 'medium', 'large'].includes(size)) { // ENUM validation
        return res.status(400).json({ message: 'Size must be small, medium, or large.' });
    }

    try {
        // Verify categoryId exists
        const [categories] = await pool.execute('SELECT category_id FROM Categories WHERE category_id = ?', [categoryId]);
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        const [result] = await pool.execute(
            'INSERT INTO Items (name, price, size, category_id, stock_quantity, description, image_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, price, size, categoryId, stockQuantity || 0, description, imageUrl, req.user.id] // created_by is admin ID
        );
        res.status(201).json({
            message: 'Item created successfully',
            item_id: result.insertId,
            name, price, size, category_id: categoryId, stock_quantity: stockQuantity || 0
        });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Failed to create item' });
    }
});

// Get All Items (Public access)
app.get('/api/items', async (req, res) => {
    try {
        // Use JOINs to get category and admin username
        const [items] = await pool.execute(`
            SELECT
                i.item_id, i.name, i.price, i.size, i.stock_quantity, i.description, i.image_url,
                c.category_name,
                a.username AS created_by_admin
            FROM Items i
            JOIN Categories c ON i.category_id = c.category_id
            JOIN Admins a ON i.created_by = a.admin_id
        `);
        res.status(200).json({ message: 'Items retrieved successfully', items });
    } catch (error) {
        console.error('Error getting items:', error);
        res.status(500).json({ message: 'Failed to retrieve items' });
    }
});

// Get One Item (Public access)
app.get('/api/items/:id', async (req, res) => {
    try {
        const [items] = await pool.execute(`
            SELECT
                i.item_id, i.name, i.price, i.size, i.stock_quantity, i.description, i.image_url,
                c.category_name,
                a.username AS created_by_admin
            FROM Items i
            JOIN Categories c ON i.category_id = c.category_id
            JOIN Admins a ON i.created_by = a.admin_id
            WHERE i.item_id = ?
        `, [req.params.id]);

        if (items.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item retrieved successfully', item: items[0] });
    } catch (error) {
        console.error('Error getting item by ID:', error);
        res.status(500).json({ message: 'Failed to retrieve item' });
    }
});

// Update Item (Admin Only)
app.put('/api/items/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name, price, size, categoryId, stockQuantity, description, imageUrl } = req.body;
    const itemId = req.params.id;

    const updateFields = [];
    const params = [];

    if (name) { updateFields.push('name = ?'); params.push(name); }
    if (price !== undefined) { updateFields.push('price = ?'); params.push(price); }
    if (size) {
        if (!['small', 'medium', 'large'].includes(size)) {
            return res.status(400).json({ message: 'Size must be small, medium, or large.' });
        }
        updateFields.push('size = ?'); params.push(size);
    }
    if (stockQuantity !== undefined) { updateFields.push('stock_quantity = ?'); params.push(stockQuantity); }
    if (description) { updateFields.push('description = ?'); params.push(description); }
    if (imageUrl) { updateFields.push('image_url = ?'); params.push(imageUrl); }
    if (categoryId) {
        const [categories] = await pool.execute('SELECT category_id FROM Categories WHERE category_id = ?', [categoryId]);
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        updateFields.push('category_id = ?'); params.push(categoryId);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields provided for update.' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP'); // Automatically update timestamp

    const sql = `UPDATE Items SET ${updateFields.join(', ')} WHERE item_id = ?`;
    params.push(itemId);

    try {
        const [result] = await pool.execute(sql, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found or no changes made' });
        }
        res.status(200).json({ message: 'Item updated successfully' });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Failed to update item' });
    }
});

// Delete Item (Admin Only)
app.delete('/api/items/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const itemId = req.params.id;
    try {
        const [result] = await pool.execute('DELETE FROM Items WHERE item_id = ?', [itemId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') { // MySQL FK constraint violation
            return res.status(400).json({ message: 'Cannot delete item because it is referenced by existing orders.' });
        }
        res.status(500).json({ message: 'Failed to delete item' });
    }
});


// --- Order Routes ---

// Place Order (User Only)
app.post('/api/orders', authenticateToken, async (req, res) => {
    // Ensure the user is a regular user for placing orders
    if (req.user.role !== 'user' || req.user.type !== 'user') {
        return res.status(403).json({ message: 'Access denied: Only regular users can place orders' });
    }

    const { items: orderItems } = req.body; // Array of { itemId, quantity }

    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'Order must contain at least one item.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Start transaction

        let totalAmount = 0;
        const processedItems = []; // For storing item details to insert into Order_Items

        for (const orderItem of orderItems) {
            const { itemId, quantity } = orderItem;
            if (!itemId || !quantity || quantity <= 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Each order item must have a valid itemId and quantity (> 0).' });
            }

            const [items] = await connection.execute('SELECT item_id, name, price, stock_quantity FROM Items WHERE item_id = ?', [itemId]);
            const item = items[0];

            if (!item) {
                await connection.rollback();
                return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
            }
            if (item.stock_quantity < quantity) {
                await connection.rollback();
                return res.status(400).json({ message: `Insufficient stock for item: ${item.name}. Available: ${item.stock_quantity}` });
            }

            // Decrement stock (update in Items table)
            await connection.execute(
                'UPDATE Items SET stock_quantity = stock_quantity - ? WHERE item_id = ?',
                [quantity, itemId]
            );

            totalAmount += item.price * quantity;
            processedItems.push({
                itemId: item.item_id,
                name: item.name,
                price: item.price,
                quantity: quantity
            });
        }

        // Insert the new order
        const [orderResult] = await connection.execute(
            'INSERT INTO Orders (user_id, total_amount, status) VALUES (?, ?, ?)',
            [req.user.id, totalAmount, 'pending']
        );
        const newOrderId = orderResult.insertId;

        // Insert items into Order_Items junction table
        for (const pItem of processedItems) {
            await connection.execute(
                'INSERT INTO Order_Items (order_id, item_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
                [newOrderId, pItem.itemId, pItem.quantity, pItem.price]
            );
        }

        await connection.commit(); // Commit transaction
        res.status(201).json({ message: 'Order placed successfully', order_id: newOrderId, total_amount: totalAmount, items: processedItems });

    } catch (error) {
        if (connection) await connection.rollback(); // Rollback on error
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order' });
    } finally {
        if (connection) connection.release();
    }
});

// Get All Orders (Admin can see all, User can see their own)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        let sql = `
            SELECT
                o.order_id, o.order_date, o.total_amount, o.status, o.approved_at,
                u.username AS customer_username, u.email AS customer_email,
                a.username AS approved_by_admin_username, a.email AS approved_by_admin_email,
                oi.item_id, oi.quantity, oi.price_at_order,
                i.name AS item_name, i.price AS item_current_price, i.size AS item_size
            FROM Orders o
            JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Admins a ON o.approved_by = a.admin_id
            JOIN Order_Items oi ON o.order_id = oi.order_id
            JOIN Items i ON oi.item_id = i.item_id
        `;
        const params = [];

        // If the authenticated user is a regular user, they can only see their own orders
        if (req.user.role === 'user') {
            sql += ' WHERE o.user_id = ?';
            params.push(req.user.id);
        }
        // Admins see all orders (no WHERE clause added)

        sql += ' ORDER BY o.order_date DESC, o.order_id, i.name';

        const [rows] = await pool.execute(sql, params);

        // Group results by order_id, similar to how Mongoose returns nested arrays
        const ordersMap = new Map();
        rows.forEach(row => {
            if (!ordersMap.has(row.order_id)) {
                ordersMap.set(row.order_id, {
                    order_id: row.order_id,
                    order_date: row.order_date,
                    total_amount: row.total_amount,
                    status: row.status,
                    approved_at: row.approved_at,
                    customer: {
                        username: row.customer_username,
                        email: row.customer_email
                    },
                    approvedByAdmin: row.approved_by_admin_username ? {
                        username: row.approved_by_admin_username,
                        email: row.approved_by_admin_email
                    } : null,
                    items: []
                });
            }
            ordersMap.get(row.order_id).items.push({
                item_id: row.item_id,
                name: row.item_name,
                quantity: row.quantity,
                price_at_order: row.price_at_order,
                item_current_price: row.item_current_price,
                item_size: row.item_size
            });
        });

        res.status(200).json({ message: 'Orders retrieved successfully', orders: Array.from(ordersMap.values()) });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ message: 'Failed to retrieve orders' });
    }
});

// Update Order Status (Admin Only)
app.put('/api/orders/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    if (!status || !['approved', 'disapproved'].includes(status)) {
        return res.status(400).json({ message: 'Status must be "approved" or "disapproved".' });
    }

    try {
        const [result] = await pool.execute(
            'UPDATE Orders SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
            [status, req.user.id, orderId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Fetch the updated order to return it
        const [updatedOrder] = await pool.execute('SELECT * FROM Orders WHERE order_id = ?', [orderId]);

        res.status(200).json({ message: `Order status updated to ${status} successfully`, order: updatedOrder[0] });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});


// --- Global Error Handler (Keep at the end) ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
