// Import Node.js built-in modules
const http = require('http'); // Used for creating HTTP server
const url = require('url');   // Used for parsing URLs
const dataHandler = require('../api_server/data.js'); // Custom module for file operations
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs (install with `npm install uuid`)

// Define the port the server will listen on
const PORT = 4000;

// Initialize the items.json file if it doesn't exist or is empty
dataHandler.initializeItemsFile();

// Helper function to send JSON responses
function sendJsonResponse(res, statusCode, data, message = '') {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: statusCode < 400 ? 'success' : 'error', message: message, data: data }));
}

// Helper function to parse JSON body from request
function parseRequestBody(req, callback) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString(); // Accumulate data chunks
    });
    req.on('end', () => {
        try {
            const parsedBody = body ? JSON.parse(body) : {};
            callback(null, parsedBody); // Pass parsed body to callback
        } catch (error) {
            callback(error); // Pass parsing error to callback
        }
    });
}

// Helper function to validate and normalize size(s)
function validateAndNormalizeSize(sizeInput) {
    if (sizeInput === undefined || sizeInput === null) {
        return { isValid: true, normalizedSize: undefined }; // No size provided, no validation needed
    }

    let sizesArray = Array.isArray(sizeInput) ? sizeInput : [sizeInput];
    const validSizes = ['s', 'm', 'l'];
    let normalizedSizes = [];

    for (const s of sizesArray) {
        if (typeof s !== 'string') {
            return { isValid: false, message: 'Each size value must be a string.' };
        }
        const lowerCaseSize = s.toLowerCase().trim();
        if (!validSizes.includes(lowerCaseSize)) {
            return { isValid: false, message: `Invalid size value: ${s}. Allowed values are s, m, l.` };
        }
        normalizedSizes.push(lowerCaseSize);
    }

    if (normalizedSizes.length === 0) {
        return { isValid: false, message: 'Size cannot be an empty array.' };
    }

    // Ensure unique sizes and sort them for consistency
    normalizedSizes = [...new Set(normalizedSizes)].sort();

    return { isValid: true, normalizedSize: normalizedSizes };
}


// Create the HTTP API server
const server = http.createServer(async (req, res) => {
    // Parse the URL to get pathname and query parameters
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query; // Query parameters from the URL

    // Log the incoming request details
    console.log(`API Request: Method=${req.method}, Path=${pathname}`);

    // Route handling based on method and pathname
    if (pathname === '/') {
        // Handle requests to the base URL
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server connected successfully');
    }
    else if (pathname === '/items') {
        // Handle GET all items
        if (req.method === 'GET') {
            try {
                const items = await dataHandler.readItems();
                sendJsonResponse(res, 200, items, 'All items retrieved successfully.');
            } catch (error) {
                console.error('Error getting all items:', error);
                sendJsonResponse(res, 500, null, 'Failed to retrieve items.');
            }
        }
        // Handle POST (Create item)
        else if (req.method === 'POST') {
            parseRequestBody(req, async (err, newItem) => {
                if (err) {
                    return sendJsonResponse(res, 400, null, 'Invalid JSON in request body.');
                }

                // Validate required fields for a new item
                if (!newItem.name || !newItem.price || newItem.size === undefined) {
                    return sendJsonResponse(res, 400, null, 'Name, Price, and Size are required.');
                }

                // Validate and normalize size
                const sizeValidation = validateAndNormalizeSize(newItem.size);
                if (!sizeValidation.isValid) {
                    return sendJsonResponse(res, 400, null, sizeValidation.message);
                }
                newItem.size = sizeValidation.normalizedSize; // Store as array

                if (typeof newItem.price !== 'number' || newItem.price <= 0) {
                    return sendJsonResponse(res, 400, null, 'Price must be a positive number.');
                }

                newItem.id = uuidv4(); // Generate a unique ID for the new item
                newItem.name = newItem.name.trim();

                try {
                    const items = await dataHandler.readItems();
                    items.push(newItem); // Add the new item to the array
                    await dataHandler.writeItems(items); // Persist the updated array to file
                    sendJsonResponse(res, 201, newItem, 'Item created successfully.');
                } catch (error) {
                    console.error('Error creating item:', error);
                    sendJsonResponse(res, 500, null, 'Failed to create item.');
                }
            });
        }
        // Method Not Allowed for /items path
        else {
            sendJsonResponse(res, 405, null, 'Method Not Allowed for /items');
        }
    }
    else if (pathname.startsWith('/items/')) {
        // Extract item ID from the URL path (e.g., /items/123)
        const itemId = pathname.split('/')[2];

        // Handle GET one item
        if (req.method === 'GET') {
            if (!itemId) {
                return sendJsonResponse(res, 400, null, 'Item ID is required in URL.');
            }
            try {
                const items = await dataHandler.readItems();
                const item = items.find(i => i.id === itemId);

                if (item) {
                    sendJsonResponse(res, 200, item, `Item with ID ${itemId} retrieved.`);
                } else {
                    sendJsonResponse(res, 404, null, `Item with ID ${itemId} not found.`);
                }
            } catch (error) {
                console.error('Error getting item by ID:', error);
                sendJsonResponse(res, 500, null, 'Failed to retrieve item.');
            }
        }
        // Handle PUT (Update item)
        else if (req.method === 'PUT') {
            if (!itemId) {
                return sendJsonResponse(res, 400, null, 'Item ID is required in URL.');
            }
            parseRequestBody(req, async (err, updatedFields) => { // Renamed to updatedFields for clarity
                if (err) {
                    return sendJsonResponse(res, 400, null, 'Invalid JSON in request body.');
                }

                // Prevent updating the 'name' field
                if (updatedFields.name !== undefined) {
                    return sendJsonResponse(res, 400, null, 'Updating "name" field is not allowed via PUT.');
                }

                // Basic validation for price
                if (updatedFields.price !== undefined && (typeof updatedFields.price !== 'number' || updatedFields.price <= 0)) {
                    return sendJsonResponse(res, 400, null, 'Price must be a positive number.');
                }

                try {
                    let items = await dataHandler.readItems();
                    const index = items.findIndex(i => i.id === itemId);

                    if (index !== -1) {
                        const existingItem = items[index];
                        let itemModified = false;

                        // Only update 'price' if provided in the request body
                        if (updatedFields.price !== undefined) {
                            existingItem.price = updatedFields.price;
                            itemModified = true;
                        }

                        // Only update 'size' if provided and valid
                        if (updatedFields.size !== undefined) {
                            const sizeValidation = validateAndNormalizeSize(updatedFields.size);
                            if (!sizeValidation.isValid) {
                                return sendJsonResponse(res, 400, null, sizeValidation.message);
                            }
                            existingItem.size = sizeValidation.normalizedSize; // Store as array
                            itemModified = true;
                        }

                        if (itemModified) {
                            await dataHandler.writeItems(items); // Persist updated array
                            sendJsonResponse(res, 200, existingItem, `Item with ID ${itemId} updated successfully.`);
                        } else {
                            sendJsonResponse(res, 200, existingItem, 'No valid fields provided for update (only price and size are updatable).');
                        }

                    } else {
                        sendJsonResponse(res, 404, null, `Item with ID ${itemId} not found.`);
                    }
                } catch (error) {
                    console.error('Error updating item:', error);
                    sendJsonResponse(res, 500, null, 'Failed to update item.');
                }
            });
        }
        // Handle DELETE item
        else if (req.method === 'DELETE') {
            if (!itemId) {
                return sendJsonResponse(res, 400, null, 'Item ID is required in URL.');
            }
            try {
                let items = await dataHandler.readItems();
                const initialLength = items.length;
                // Filter out the item to be deleted
                items = items.filter(i => i.id !== itemId);

                if (items.length < initialLength) {
                    await dataHandler.writeItems(items); // Persist updated array
                    sendJsonResponse(res, 200, null, `Item with ID ${itemId} deleted successfully.`);
                } else {
                    sendJsonResponse(res, 404, null, `Item with ID ${itemId} not found.`);
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                sendJsonResponse(res, 500, null, 'Failed to delete item.');
            }
        }
        // Method Not Allowed for /items/:id path
        else {
            sendJsonResponse(res, 405, null, `Method Not Allowed for /items/${itemId}`);
        }
    }
    // Handle requests to unknown paths
    else {
        sendJsonResponse(res, 404, null, 'Endpoint not found. Use / or /items or /items/:id');
    }
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`API Server running at http://localhost:${PORT}/`);
    console.log('Available API Endpoints:');
    console.log('  GET /                - Check server connection');
    console.log('  GET /items           - Get all items');
    console.log('  POST /items          - Create a new item (body: {name, price, size: string | string[]})');
    console.log('  GET /items/:id       - Get a single item by ID');
    console.log('  PUT /items/:id       - Update an item by ID (body: {price?, size?: string | string[]}) - Name cannot be updated!');
    console.log('  DELETE /items/:id    - Delete an item by ID');
});
