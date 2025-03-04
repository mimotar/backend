import dotenv from "dotenv";
dotenv.config({ path: '.env.test' });

jest.setTimeout(30000);

beforeAll(() => {
    // Any global setup code can go here
    console.log('Starting tests...');
  });
  
  afterAll(() => {
    // Any global cleanup code can go here
    console.log('All tests completed.');
  });