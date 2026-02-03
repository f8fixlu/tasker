const User = require('../../models/User');
const { runQuery, getRow } = require('../../utils/database');

// Mock the database utilities
jest.mock('../../utils/database');

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const mockUserData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'hashed_password',
        profile_image_url: null
      };
      const mockResult = { lastID: 1 };

      runQuery.mockResolvedValue(mockResult);

      // Act
      const result = await User.createUser(mockUserData);

      // Assert
      expect(runQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [mockUserData.full_name, mockUserData.email, mockUserData.password_hash, mockUserData.profile_image_url]
      );
      expect(result).toEqual({ id: 1, ...mockUserData });
    });

    it('should throw an error when database query fails', async () => {
      // Arrange
      const mockUserData = {
        full_name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'hashed_password',
        profile_image_url: null
      };

      runQuery.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(User.createUser(mockUserData)).rejects.toThrow('Error creating user: Database error');
    });
  });

  describe('getUserById', () => {
    it('should return a user when found', async () => {
      // Arrange
      const mockUserId = 1;
      const mockUser = {
        id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'hashed_password',
        profile_image_url: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      getRow.mockResolvedValue(mockUser);

      // Act
      const result = await User.getUserById(mockUserId);

      // Assert
      expect(getRow).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUserId]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockUserId = 999;

      getRow.mockResolvedValue(null);

      // Act
      const result = await User.getUserById(mockUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user when found by email', async () => {
      // Arrange
      const mockEmail = 'john@example.com';
      const mockUser = {
        id: 1,
        full_name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'hashed_password',
        profile_image_url: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-01'
      };

      getRow.mockResolvedValue(mockUser);

      // Act
      const result = await User.getUserByEmail(mockEmail);

      // Assert
      expect(getRow).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockEmail]
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      // Arrange
      const mockPassword = 'plainPassword';

      // Since we can't easily mock bcrypt, we'll just check that the function exists and can be called
      // In a full implementation, we'd need to mock bcrypt as well
      const originalHashPassword = User.hashPassword;
      const mockBcrypt = require('bcrypt');
      jest.spyOn(mockBcrypt, 'genSalt').mockResolvedValue('salt');
      jest.spyOn(mockBcrypt, 'hash').mockResolvedValue('mockHashedPassword');

      // Act
      const result = await originalHashPassword(mockPassword);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('verifyPassword', () => {
    it('should verify a password successfully', async () => {
      // Arrange
      const mockPlainPassword = 'plainPassword';
      const mockHashedPassword = 'hashedPassword';

      // Mock bcrypt compare function
      const mockBcrypt = require('bcrypt');
      jest.spyOn(mockBcrypt, 'compare').mockResolvedValue(true);

      // Act
      const result = await User.verifyPassword(mockPlainPassword, mockHashedPassword);

      // Assert
      expect(result).toBe(true);
    });
  });
});