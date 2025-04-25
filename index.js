import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const ASSUMED_JOINING_AGE = 22;
const MAX_QUERY_LENGTH = 200;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const EMPLOYEE_DATA_PATH = join(__dirname, 'employee.json');

// Cache mechanism
let employeeCache = {
    data: null,
    lastUpdated: null
};

// Create an MCP server
const server = new McpServer({
    name: "Fetch User Details",
    version: "1.0.0"
});

function loadEmployeeData() {
    const now = Date.now();
    if (employeeCache.data && employeeCache.lastUpdated && (now - employeeCache.lastUpdated < CACHE_DURATION)) {
        return employeeCache.data;
    }

    try {
        if (!readFileSync(EMPLOYEE_DATA_PATH, 'utf8')) {
            throw new Error(`Employee data file not found at ${EMPLOYEE_DATA_PATH}`);
        }
        const data = JSON.parse(readFileSync(EMPLOYEE_DATA_PATH, 'utf8'));
        employeeCache = {
            data,
            lastUpdated: now
        };
        return data;
    } catch (error) {
        console.error('Error loading employee data:', error);
        throw new Error('Failed to load employee data: ' + error.message);
    }
}

function sanitizeInput(input) {
    return input
        .trim()
        .replace(/[^\w\s-]/g, '')
        .substring(0, MAX_QUERY_LENGTH);
}

function extractNameFromQuery(query) {
    // Convert query to lowercase for better matching
    query = query.toLowerCase();

    // Common patterns in natural language queries
    const patterns = [
        /about\s+([a-z\s]+)(?:'s|\s|$)/i,
        /tell\s+me\s+about\s+([a-z\s]+)(?:'s|\s|$)/i,
        /what\s+is\s+([a-z\s]+)(?:'s|\s|$)/i,
        /([a-z\s]+)(?:'s|\s+)(?:experience|details|info|information)/i,
        /find\s+([a-z\s]+)(?:'s|\s|$)/i,
        /search\s+for\s+([a-z\s]+)(?:'s|\s|$)/i
    ];

    for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            return sanitizeInput(match[1]);
        }
    }

    return sanitizeInput(query);
}

function generateEmail(name) {
    return `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@viitor.cloud`;
}

function getUserDataByName(query) {
    try {
        // Input validation
        if (!query) {
            return { error: "Query parameter is required" };
        }

        if (typeof query !== 'string') {
            return { error: "Query must be a string" };
        }

        if (query.length > MAX_QUERY_LENGTH) {
            return { error: `Query too long. Maximum length is ${MAX_QUERY_LENGTH} characters` };
        }

        // Extract name from natural language query
        const searchName = extractNameFromQuery(query);

        if (!searchName) {
            return { error: "Could not identify a name in the query" };
        }

        // Get employee data from cache or file
        const employeeData = loadEmployeeData();

        if (!Array.isArray(employeeData)) {
            throw new Error('Invalid data format: expected an array of employees');
        }

        // Find the employee by name (case-insensitive)
        const employee = employeeData.find(emp =>
            emp.name && emp.name.toLowerCase().includes(searchName.toLowerCase())
        );

        if (!employee) {
            return {
                error: `Unable to find details for '${searchName}'. Please try with a different name or rephrase your query.`
            };
        }

        // Calculate years since joining
        const joiningDate = new Date(employee.joining_date);
        const today = new Date();
        const yearsSinceJoining = today.getFullYear() - joiningDate.getFullYear();

        const response = {
            name: employee.name,
            age: yearsSinceJoining + ASSUMED_JOINING_AGE,
            email: generateEmail(employee.name),
            experience: employee.experience,
            availability: employee.availability,
            skills: employee.skills,
            joining_date: employee.joining_date
        };

        // Format response based on query type
        const queryLower = query.toLowerCase();
        if (queryLower.includes('experience')) {
            return {
                ...response,
                summary: `${employee.name} has ${employee.experience} of experience and specializes in ${employee.skills.join(', ')}.`
            };
        } else if (queryLower.includes('skill') || queryLower.includes('skills')) {
            return {
                ...response,
                summary: `${employee.name}'s skills include: ${employee.skills.join(', ')}.`
            };
        } else if (queryLower.includes('availability')) {
            return {
                ...response,
                summary: `${employee.name}'s availability status is: ${employee.availability}.`
            };
        }

        return response;

    } catch (error) {
        console.error('Error processing request:', error);
        return {
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        };
    }
}

server.tool('getUserDataByName', {
    name: z.string()
}, async ({ name }) => {
    try {
        const result = getUserDataByName(name);

        // If there's an error, format it according to MCP protocol
        if (result.error) {
            return {
                content: [{
                    type: "error",
                    text: result.error
                }]
            };
        }

        // Format successful response
        return {
            content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)  // Pretty print JSON
            }]
        };
    } catch (error) {
        console.error('Server error:', error);
        return {
            content: [{
                type: "error",
                text: "Internal server error occurred"
            }]
        };
    }
});

async function init() {
    try {
        // Verify employee data file exists and is readable
        loadEmployeeData();

        // Start receiving messages on stdin and sending messages on stdout
        const transport = new StdioServerTransport();
        await server.connect(transport);

        console.log('MCP Server started successfully');
    } catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

init();

export { getUserDataByName };