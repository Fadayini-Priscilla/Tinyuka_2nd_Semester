// Import Node.js built-in modules
const fs = require('fs').promises; // Using promises-based file system methods for async/await
const path = require('path');     // Used for resolving file paths

// Define the path to the data file
const ITEMS_FILE = path.join(__dirname, 'items.json');

/**
 * Reads all items from the items.json file.
 * If the file doesn't exist or is empty/invalid, it returns an empty array.
 * @returns {Promise<Array>} A promise that resolves with an array of items.
 */
async function readItems() {
    try {
        // Read the file content
        const data = await fs.readFile(ITEMS_FILE, 'utf8');
        // Parse the JSON data
        return JSON.parse(data);
    } catch (error) {
        // If file not found or parsing error, log and return empty array
        if (error.code === 'ENOENT' || error instanceof SyntaxError) {
            console.warn(`items.json not found or invalid. Initializing with empty array. Error: ${error.message}`);
            return [];
        }
        // Re-throw other errors
        throw error;
    }
}

/**
 * Writes an array of items to the items.json file.
 * @param {Array} items - The array of items to write.
 * @returns {Promise<void>} A promise that resolves when the write operation is complete.
 */
async function writeItems(items) {
    try {
        // Stringify the items array with pretty-printing (2 spaces indentation)
        await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to items.json:', error);
        throw error;
    }
}

/**
 * Initializes the items.json file if it does not exist.
 * Ensures the file is present with an empty array.
 */
async function initializeItemsFile() {
    try {
        // Check if the file exists
        await fs.access(ITEMS_FILE);
        // If it exists, read it to ensure it's valid JSON
        const data = await fs.readFile(ITEMS_FILE, 'utf8');
        if (!data.trim()) { // If file is empty or just whitespace
            console.log('items.json exists but is empty. Writing empty array.');
            await writeItems([]);
        } else {
            // Try parsing to catch invalid JSON on startup
            JSON.parse(data);
            console.log('items.json exists and is valid.');
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If file does not exist, create it with an empty array
            console.log('items.json does not exist. Creating with empty array.');
            await writeItems([]);
        } else if (error instanceof SyntaxError) {
            console.warn(`items.json contains invalid JSON. Overwriting with empty array. Error: ${error.message}`);
            await writeItems([]);
        } else {
            console.error('Error initializing items.json:', error);
            throw error;
        }
    }
}

// Export the functions to be used by other modules
module.exports = {
    readItems,
    writeItems,
    initializeItemsFile
};