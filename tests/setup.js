// Aumentar el timeout para pruebas
jest.setTimeout(10000);

// Silenciar logs durante las pruebas
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn(); 