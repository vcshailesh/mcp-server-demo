import { getUserDataByName } from './index.js';

// Test 1: Simple name query
console.log('Test 1 - Simple name query:');
console.log(JSON.stringify(getUserDataByName('Ruchit'), null, 2));

// Test 2: Natural language query about experience
console.log('\nTest 2 - Natural language query about experience:');
console.log(JSON.stringify(getUserDataByName("What is Ruchit's experience?"), null, 2));

// Test 3: Query about skills
console.log('\nTest 3 - Query about skills:');
console.log(JSON.stringify(getUserDataByName('Tell me about Dhaval skills'), null, 2));

// Test 4: Query about availability
console.log('\nTest 4 - Query about availability:');
console.log(JSON.stringify(getUserDataByName("What is Shailesh's availability?"), null, 2));

// Test 5: Complex natural language query
console.log('\nTest 5 - Complex natural language query:');
console.log(JSON.stringify(getUserDataByName('Can you tell me about Vinay Prajapati?'), null, 2));

// Test 6: Non-existent user
console.log('\nTest 6 - Non-existent user:');
console.log(JSON.stringify(getUserDataByName('Tell me about John Doe'), null, 2)); 