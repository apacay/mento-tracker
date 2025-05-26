require('jest-fetch-mock').enableMocks();

// Mock TextEncoder/TextDecoder
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock window.location
delete window.location;
window.location = {
  href: '',
  search: '',
  hash: '',
  pathname: '/',
  reload: jest.fn(),
  assign: jest.fn(),
  replace: jest.fn()
};

// Configurar fetch mock globalmente
global.fetch = require('jest-fetch-mock'); 