// Import Node.js built-in modules
const http = require('http'); // Used for creating HTTP server
const fs = require('fs');     // Used for file system operations (reading files)
const path = require('path'); // Used for resolving and normalizing file paths

// Define host and port
const hostname = '127.0.0.1';
const port = 3000;




// Create the HTTP server
const server = http.createServer((req, res) => {
    // Log the incoming request URL for debugging purposes
    console.log(`Request received for: ${req.url}`);

    // Determine the requested file path
    // The `req.url` typically starts with a '/', so we remove it for file path
    let filePath = '.' + req.url; // e.g., './index.html', './random.html'

    // Handle request to home path
    if (req.url === '/') {
        // Handle requests to the base URL
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server connected successfully');
    }
    

    // Handle the specific case for '/index.html'
    else if (req.url === '/index.html' /*&& method === 'GET'*/) {
        // Construct the full path to index.html
        const indexPath = path.join(__dirname, 'index.html');

        // Read the index.html file
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                // If there's an error reading the file (e.g., not found, permissions)
                console.error(`Error reading index.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // If the file is read successfully, send it with a 200 OK status
                res.writeHead(200, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the file content as the response body
            }
        });
    }
    // Handle requests for any other HTML files (e.g., '/{random}.html')
    else if (filePath.endsWith('.html')) {
        // Construct the full path to the 404.html page
        const notFoundPath = path.join(__dirname, '404.html');

        // Read the 404.html file
        fs.readFile(notFoundPath, (err, data) => {
            if (err) {
                // If 404.html itself is not found or unreadable
                console.error(`Error reading 404.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // Send the 404.html content with a 404 Not Found status
                res.writeHead(404, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the 404 file content
            }
        });
    }

<<<<<<< HEAD
=======
    // Handle all other requests (e.g., non-HTML files, unknown paths)
    else {
        filePath.endsWith('.css')
        filePath.endsWith('.js')
        filePath.endsWith('.png')
        filePath.endsWith('.jpg')
        filePath.endsWith('.jpeg')
        filePath.endsWith('.gif')
        filePath.endsWith('.mp3')
        filePath.endsWith('.mp4')
        filePath.endsWith('.mov')
        filePath.endsWith('.txt')
        filePath.endsWith('.pdf')
        filePath.endsWith('.doc')
        filePath.endsWith('.docx')
        filePath.endsWith('.xls')
        filePath.endsWith('.xlsx')
        filePath.endsWith('.ppt')
        filePath.endsWith('.pptx')
        // For any other path, return a generic 404 Not Found response
        // This is a fallback if the request isn't an HTML file
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: Resource not found. Please try a valid file path');
    }
});

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Web Server running at http://localhost:${port}/`);
    console.log('Try navigating to http://localhost:3000/index.html');
    console.log('Or try http://localhost:3000/some-random-page.html to see the 404 page.');
});// Import Node.js built-in modules
const http = require('http'); // Used for creating HTTP server
const fs = require('fs');     // Used for file system operations (reading files)
const path = require('path'); // Used for resolving and normalizing file paths

// Define host and port
const hostname = '127.0.0.1';
const port = 3000;




// Create the HTTP server
const server = http.createServer((req, res) => {
    // Log the incoming request URL for debugging purposes
    console.log(`Request received for: ${req.url}`);

    // Determine the requested file path
    // The `req.url` typically starts with a '/', so we remove it for file path
    let filePath = '.' + req.url; // e.g., './index.html', './random.html'

    // Handle request to home path
    if (req.url === '/') {
        // Handle requests to the base URL
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server connected successfully');
    }
    

    // Handle the specific case for '/index.html'
    else if (req.url === '/index.html' /*&& method === 'GET'*/) {
        // Construct the full path to index.html
        const indexPath = path.join(__dirname, 'index.html');

        // Read the index.html file
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                // If there's an error reading the file (e.g., not found, permissions)
                console.error(`Error reading index.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // If the file is read successfully, send it with a 200 OK status
                res.writeHead(200, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the file content as the response body
            }
        });
    }
    // Handle requests for any other HTML files (e.g., '/{random}.html')
    else if (filePath.endsWith('.html')) {
        // Construct the full path to the 404.html page
        const notFoundPath = path.join(__dirname, '404.html');

        // Read the 404.html file
        fs.readFile(notFoundPath, (err, data) => {
            if (err) {
                // If 404.html itself is not found or unreadable
                console.error(`Error reading 404.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // Send the 404.html content with a 404 Not Found status
                res.writeHead(404, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the 404 file content
            }
        });
    }

>>>>>>> 19b5d14643884cbb26fd252fcf7d3b277aea1d3b
    // Handle all other requests (e.g., non-HTML files, unknown paths)
    else {
        filePath.endsWith('.css')
        filePath.endsWith('.js')
        filePath.endsWith('.png')
        filePath.endsWith('.jpg')
        filePath.endsWith('.jpeg')
        filePath.endsWith('.gif')
        filePath.endsWith('.mp3')
        filePath.endsWith('.mp4')
        filePath.endsWith('.mov')
        filePath.endsWith('.txt')
        filePath.endsWith('.pdf')
        filePath.endsWith('.doc')
        filePath.endsWith('.docx')
        filePath.endsWith('.xls')
        filePath.endsWith('.xlsx')
        filePath.endsWith('.ppt')
        filePath.endsWith('.pptx')
        // For any other path, return a generic 404 Not Found response
        // This is a fallback if the request isn't an HTML file
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: Resource not found. Please try a valid file path');
    }
});

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Web Server running at http://localhost:${port}/`);
    console.log('Try navigating to http://localhost:3000/index.html');
    console.log('Or try http://localhost:3000/some-random-page.html to see the 404 page.');
});// Import Node.js built-in modules
const http = require('http'); // Used for creating HTTP server
const fs = require('fs');     // Used for file system operations (reading files)
const path = require('path'); // Used for resolving and normalizing file paths

// Define host and port
const hostname = '127.0.0.1';
const port = 3000;




// Create the HTTP server
const server = http.createServer((req, res) => {
    // Log the incoming request URL for debugging purposes
    console.log(`Request received for: ${req.url}`);

    // Determine the requested file path
    // The `req.url` typically starts with a '/', so we remove it for file path
    let filePath = '.' + req.url; // e.g., './index.html', './random.html'

    // Handle request to home path
    if (req.url === '/') {
        // Handle requests to the base URL
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server connected successfully');
    }
    

    // Handle the specific case for '/index.html'
    else if (req.url === '/index.html' /*&& method === 'GET'*/) {
        // Construct the full path to index.html
        const indexPath = path.join(__dirname, 'index.html');

        // Read the index.html file
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                // If there's an error reading the file (e.g., not found, permissions)
                console.error(`Error reading index.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // If the file is read successfully, send it with a 200 OK status
                res.writeHead(200, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the file content as the response body
            }
        });
    }
    // Handle requests for any other HTML files (e.g., '/{random}.html')
    else if (filePath.endsWith('.html')) {
        // Construct the full path to the 404.html page
        const notFoundPath = path.join(__dirname, '404.html');

        // Read the 404.html file
        fs.readFile(notFoundPath, (err, data) => {
            if (err) {
                // If 404.html itself is not found or unreadable
                console.error(`Error reading 404.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // Send the 404.html content with a 404 Not Found status
                res.writeHead(404, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the 404 file content
            }
        });
    }

    // Handle all other requests (e.g., non-HTML files, unknown paths)
    else {
        filePath.endsWith('.css')
        filePath.endsWith('.js')
        filePath.endsWith('.png')
        filePath.endsWith('.jpg')
        filePath.endsWith('.jpeg')
        filePath.endsWith('.gif')
        filePath.endsWith('.mp3')
        filePath.endsWith('.mp4')
        filePath.endsWith('.mov')
        filePath.endsWith('.txt')
        filePath.endsWith('.pdf')
        filePath.endsWith('.doc')
        filePath.endsWith('.docx')
        filePath.endsWith('.xls')
        filePath.endsWith('.xlsx')
        filePath.endsWith('.ppt')
        filePath.endsWith('.pptx')
        // For any other path, return a generic 404 Not Found response
        // This is a fallback if the request isn't an HTML file
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: Resource not found. Please try a valid file path');
    }
});

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Web Server running at http://localhost:${port}/`);
    console.log('Try navigating to http://localhost:3000/index.html');
    console.log('Or try http://localhost:3000/some-random-page.html to see the 404 page.');
});// Import Node.js built-in modules
const http = require('http'); // Used for creating HTTP server
const fs = require('fs');     // Used for file system operations (reading files)
const path = require('path'); // Used for resolving and normalizing file paths

// Define host and port
const hostname = '127.0.0.1';
const port = 3000;




// Create the HTTP server
const server = http.createServer((req, res) => {
    // Log the incoming request URL for debugging purposes
    console.log(`Request received for: ${req.url}`);

    // Determine the requested file path
    // The `req.url` typically starts with a '/', so we remove it for file path
    let filePath = '.' + req.url; // e.g., './index.html', './random.html'

    // Handle request to home path
    if (req.url === '/') {
        // Handle requests to the base URL
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server connected successfully');
    }
    

    // Handle the specific case for '/index.html'
    else if (req.url === '/index.html' /*&& method === 'GET'*/) {
        // Construct the full path to index.html
        const indexPath = path.join(__dirname, 'index.html');

        // Read the index.html file
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                // If there's an error reading the file (e.g., not found, permissions)
                console.error(`Error reading index.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // If the file is read successfully, send it with a 200 OK status
                res.writeHead(200, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the file content as the response body
            }
        });
    }
    // Handle requests for any other HTML files (e.g., '/{random}.html')
    else if (filePath.endsWith('.html')) {
        // Construct the full path to the 404.html page
        const notFoundPath = path.join(__dirname, '404.html');

        // Read the 404.html file
        fs.readFile(notFoundPath, (err, data) => {
            if (err) {
                // If 404.html itself is not found or unreadable
                console.error(`Error reading 404.html: ${err.message}`);
                res.writeHead(500, { 'Content-Type': 'text/plain' }); // Internal Server Error
                res.end('500 Internal Server Error');
            } else {
                // Send the 404.html content with a 404 Not Found status
                res.writeHead(404, { 'Content-Type': 'text/html' }); // Set Content-Type to HTML
                res.end(data); // Send the 404 file content
            }
        });
    }

    // Handle all other requests (e.g., non-HTML files, unknown paths)
    else {
        filePath.endsWith('.css')
        filePath.endsWith('.js')
        filePath.endsWith('.png')
        filePath.endsWith('.jpg')
        filePath.endsWith('.jpeg')
        filePath.endsWith('.gif')
        filePath.endsWith('.mp3')
        filePath.endsWith('.mp4')
        filePath.endsWith('.mov')
        filePath.endsWith('.txt')
        filePath.endsWith('.pdf')
        filePath.endsWith('.doc')
        filePath.endsWith('.docx')
        filePath.endsWith('.xls')
        filePath.endsWith('.xlsx')
        filePath.endsWith('.ppt')
        filePath.endsWith('.pptx')
        // For any other path, return a generic 404 Not Found response
        // This is a fallback if the request isn't an HTML file
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: Resource not found. Please try a valid file path');
    }
});

// Start the server and listen on the specified port
server.listen(port, () => {
    console.log(`Web Server running at http://localhost:${port}/`);
    console.log('Try navigating to http://localhost:3000/index.html');
    console.log('Or try http://localhost:3000/some-random-page.html to see the 404 page.');
});
