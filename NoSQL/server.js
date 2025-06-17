require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

// --- Mongoose Connection Setup ---
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully via Mongoose!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Express Middleware ---
app.use(express.json()); // For parsing application/json

// --- Mongoose Schemas & Models ---

// User Schema (for regular users)
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Admin Schema (separate entity for administrators)
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Admin = mongoose.model('Admin', AdminSchema);

// Category Schema
const CategorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', CategorySchema);

// Item Schema
const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, required: true, enum: ['small', 'medium', 'large'] },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    stockQuantity: { type: Number, default: 0, min: 0 },
    description: { type: String },
    imageUrl: { type: String },
    createdByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Item = mongoose.model('Item', ItemSchema);

// Order Item Sub-schema (embedded in Order)
const OrderItemSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    name: { type: String, required: true }, // Denormalized item name
    price: { type: Number, required: true, min: 0 }, // Denormalized item price at order time
    quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// Order Schema
const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderDate: { type: Date, default: Date.now },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['pending', 'approved', 'disapproved'], default: 'pending' },
    approvedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    items: [OrderItemSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

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

        let newUser;
        if (type === 'user') {
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.status(409).json({ message: 'User with this username or email already exists' });
            }
            newUser = await User.create({ username, email, password_hash: hashedPassword });
            // Generate token for the newly registered user
            const token = jwt.sign({ id: newUser._id, role: 'user', type: 'user' }, jwtSecret, { expiresIn: '1h' });
            res.status(201).json({ message: 'User registered successfully', userId: newUser._id, token, role: 'user' });

        } else if (type === 'admin') {
            const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
            if (existingAdmin) {
                return res.status(409).json({ message: 'Admin with this username or email already exists' });
            }
            newUser = await Admin.create({ username, email, password_hash: hashedPassword });
            // Generate token for the newly registered admin
            const token = jwt.sign({ id: newUser._id, role: 'admin', type: 'admin' }, jwtSecret, { expiresIn: '1h' });
            res.status(201).json({ message: 'Admin registered successfully', adminId: newUser._id, token, role: 'admin' });

        } else {
            return res.status(400).json({ message: 'Invalid registration type. Must be "user" or "admin".' });
        }

    } catch (error) {
        console.error('Registration error:', error); // Log the full error for debugging

        // Check for MongoDB duplicate key error (code 11000)
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(409).json({ message: `${field} already exists. Please choose a different ${field}.` });
        }
        // Check for Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation failed', errors });
        }
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        // Try to find in Users collection
        let foundUser = await User.findOne({ email });
        let userType = 'user';

        if (!foundUser) {
            // If not found in Users, try Admins collection
            foundUser = await Admin.findOne({ email });
            userType = 'admin';
        }

        if (!foundUser) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, foundUser.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const payload = {
            id: foundUser._id,
            role: userType, // 'user' or 'admin'
            type: userType // 'user' or 'admin'
        };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        res.status(200).json({
            message: 'Login successful',
            [userType === 'user' ? 'userId' : 'adminId']: foundUser._id,
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
        const users = await User.find({}).select('-password_hash'); // Exclude password hashes
        res.status(200).json({ message: 'Users retrieved successfully', users });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Failed to retrieve users' });
    }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Delete all orders placed by this user
        const deletedOrdersResult = await Order.deleteMany({ userId: userId });
        console.log(`Deleted ${deletedOrdersResult.deletedCount} orders for user ${userId}.`);

        // 2. Delete the user account
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User and associated orders deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});


// --- Admin Account Management Routes (Admin Only) ---
app.get('/api/admins', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password_hash'); // Exclude password hashes
        res.status(200).json({ message: 'Admins retrieved successfully', admins });
    } catch (error) {
        console.error('Error getting admins:', error);
        res.status(500).json({ message: 'Failed to retrieve admins' });
    }
});

app.delete('/api/admins/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const adminId = req.params.id;

        // Prevent an admin from deleting themselves if they are the only admin left
        const adminCount = await Admin.countDocuments();
        if (adminCount === 1 && req.user.id === adminId) {
             return res.status(400).json({ message: 'Cannot delete the last remaining admin account.' });
        }

        // 1. Update orders approved by this admin: set approvedByAdminId to null
        const updatedOrdersResult = await Order.updateMany(
            { approvedByAdminId: adminId },
            { $unset: { approvedByAdminId: "", approvedAt: "" }, $set: { updatedAt: new Date() } }
        );
        console.log(`Unset approvedByAdminId for ${updatedOrdersResult.modifiedCount} orders approved by admin ${adminId}.`);

        // 2. Update items created by this admin: set createdByAdminId to null
        
        const updatedItemsResult = await Item.updateMany(
            { createdByAdminId: adminId },
            { $unset: { createdByAdminId: "" }, $set: { updatedAt: new Date() } }
        );
        console.log(`Unset createdByAdminId for ${updatedItemsResult.modifiedCount} items created by admin ${adminId}.`);

        // 3. Delete the admin account
        const deletedAdmin = await Admin.findByIdAndDelete(adminId);

        if (!deletedAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.status(200).json({ message: 'Admin account and associated references updated/deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ message: 'Failed to delete admin' });
    }
});


// --- Category Routes (Admin Only for creation, Public for GET) ---
app.post('/api/categories', authenticateToken, authorizeAdmin, async (req, res) => {
    const { categoryName, description } = req.body;
    if (!categoryName) {
        return res.status(400).json({ message: 'Category name is required' });
    }
    try {
        const newCategory = await Category.create({ categoryName, description });
        res.status(201).json({ message: 'Category created successfully', category: newCategory });
    } catch (error) {
        if (error.code === 11000) { // Duplicate key error
            return res.status(409).json({ message: 'Category name already exists' });
        }
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Failed to create category' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({});
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
    if (!['small', 'medium', 'large'].includes(size)) {
        return res.status(400).json({ message: 'Size must be small, medium, or large.' });
    }

    try {
        // Verify categoryId exists
        const categoryExists = await Category.findById(categoryId);
        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        const newItem = await Item.create({
            name,
            price,
            size,
            categoryId,
            stockQuantity: stockQuantity || 0,
            description,
            imageUrl,
            createdByAdminId: req.user.id // Set creator to the authenticated admin's ID
        });
        res.status(201).json({ message: 'Item created successfully', item: newItem });
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Failed to create item' });
    }
});

// Get All Items (Public access)
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find({}).populate('categoryId', 'categoryName').populate('createdByAdminId', 'username');
        res.status(200).json({ message: 'Items retrieved successfully', items });
    }
    catch (error) {
        console.error('Error getting items:', error);
        res.status(500).json({ message: 'Failed to retrieve items' });
    }
});

// Get One Item (Public access)
app.get('/api/items/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('categoryId', 'categoryName').populate('createdByAdminId', 'username');
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item retrieved successfully', item });
    } catch (error) {
        console.error('Error getting item by ID:', error);
        res.status(500).json({ message: 'Failed to retrieve item' });
    }
});

// Update Item (Admin Only)
app.put('/api/items/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    const { name, price, size, categoryId, stockQuantity, description, imageUrl } = req.body;

    // Basic validation for update fields if present
    if (size && !['small', 'medium', 'large'].includes(size)) {
        return res.status(400).json({ message: 'Size must be small, medium, or large.' });
    }
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
        return res.status(400).json({ message: 'Price must be a positive number.' });
    }

    try {
        const updateFields = { updatedAt: new Date() };
        if (name) updateFields.name = name;
        if (price !== undefined) updateFields.price = price;
        if (size) updateFields.size = size;
        if (stockQuantity !== undefined) updateFields.stockQuantity = stockQuantity;
        if (description) updateFields.description = description;
        if (imageUrl) updateFields.imageUrl = imageUrl;
        if (categoryId) {
            const categoryExists = await Category.findById(categoryId);
            if (!categoryExists) {
                return res.status(404).json({ message: 'Category not found.' });
            }
            updateFields.categoryId = categoryId;
        }

        const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateFields, { new: true });
        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Failed to update item' });
    }
});

// Delete Item (Admin Only)
app.delete('/api/items/:id', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const deletedItem = await Item.findByIdAndDelete(req.params.id);
        if (!deletedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }
        // Optional: Remove item from all orders if it was embedded
        // For my schema, items are referenced in `Order.items` by `itemId`.
        // So, if an item is physically deleted, orders referencing it will have dangling `itemId`s.
        // A more robust solution might handle this (e.g., set quantity to 0 or remove from array).
        // For simplicity, we just delete the item here.
        // I would also want to update the totalAmount of affected orders here.
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
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

    try {
        let totalAmount = 0;
        const processedItems = [];

        for (const orderItem of orderItems) {
            const { itemId, quantity } = orderItem;
            if (!itemId || !quantity || quantity <= 0) {
                return res.status(400).json({ message: 'Each order item must have a valid itemId and quantity (> 0).' });
            }

            const item = await Item.findById(itemId);
            if (!item) {
                return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
            }
            if (item.stockQuantity < quantity) {
                return res.status(400).json({ message: `Insufficient stock for item: ${item.name}. Available: ${item.stockQuantity}` });
            }

            // Decrement stock 
            item.stockQuantity -= quantity;
            await item.save();

            totalAmount += item.price * quantity;
            processedItems.push({
                itemId: item._id,
                name: item.name, // Denormalize name for order history
                price: item.price, // Denormalize price at time of order
                quantity: quantity
            });
        }

        const newOrder = await Order.create({
            userId: req.user.id, // User ID from authenticated token
            totalAmount: totalAmount,
            status: 'pending',
            items: processedItems
        });

        res.status(201).json({ message: 'Order placed successfully', order: newOrder });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Failed to place order' });
    }
});

// Get All Orders (Admin can see all, User can see their own)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        let query = {};
        // If the authenticated user is a regular user, they can only see their own orders
        if (req.user.role === 'user') {
            query = { userId: req.user.id };
        }
        // If the authenticated user is an admin, they can see all orders (query remains empty)

        const orders = await Order.find(query)
            .populate('userId', 'username email') // Populate user details
            .populate('approvedByAdminId', 'username email'); // Populate admin details

        res.status(200).json({ message: 'Orders retrieved successfully', orders });
    } catch (error) {
        console.error('Error getting orders:', error);
        res.status(500).json({ message: 'Failed to retrieve orders' });
    }
});

// Update Order Status (Admin Only)
app.put('/api/orders/:id/status', authenticateToken, authorizeAdmin, async (req, res) => {
    const { status } = req.body;

    if (!status || !['approved', 'disapproved'].includes(status)) {
        return res.status(400).json({ message: 'Status must be "approved" or "disapproved".' });
    }

    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: status,
                    approvedByAdminId: req.user.id, // Set the admin who approved/disapproved
                    approvedAt: new Date(),
                    updatedAt: new Date()
                }
            },
            { new: true } // Return the updated document
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: `Order status updated to ${status} successfully`, order: updatedOrder });
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
