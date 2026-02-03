const User = require('../../../models/User');
const bcrypt = require('bcrypt');

// Mock the database utilities
jest.mock('../../../utils/database', () => ({
  runQuery: jest.fn(),
  getRow: jest.fn(),
  getAll: jest.fn()
}));

describe('User Model', () => {
  describe('hashPassword', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should hash a password correctly', async () => {
      const password = 'testpassword123';
      
      // Mock bcrypt functions
      const mockSalt = 'mockSalt';
      const mockHash = 'mockHashedPassword';
      jest.spyOn(bcrypt, 'genSalt').mockResolvedValue(mockSalt);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockHash);
      
      const hashed = await User.hashPassword(password);
      
      expect(hashed).toBe(mockHash);
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12); // saltRounds = 12
      expect(bcrypt.hash).toHaveBeenCalledWith(password, mockSalt);
    });
  });

  describe('verifyPassword', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should verify a correct password', async () => {
      const password = 'testpassword123';
      const mockHash = 'mockHashedPassword';
      
      // Mock bcrypt compare function
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      
      const isValid = await User.verifyPassword(password, mockHash);
      
      expect(isValid).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockHash);
    });

    test('should reject an incorrect password', async () => {
      const password = 'testpassword123';
      const mockHash = 'mockHashedPassword';
      
      // Mock bcrypt compare function
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
      
      const isValid = await User.verifyPassword(password, mockHash);
      
      expect(isValid).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockHash);
    });
  });
});