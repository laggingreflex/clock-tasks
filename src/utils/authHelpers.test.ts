import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUserInfo, createUserFromGoogleInfo, GOOGLE_OAUTH_SCOPE } from './authHelpers';

describe('authHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GOOGLE_OAUTH_SCOPE', () => {
    it('should contain required scopes', () => {
      expect(GOOGLE_OAUTH_SCOPE).toContain('openid');
      expect(GOOGLE_OAUTH_SCOPE).toContain('email');
      expect(GOOGLE_OAUTH_SCOPE).toContain('profile');
      expect(GOOGLE_OAUTH_SCOPE).toContain('https://www.googleapis.com/auth/drive.file');
    });

    it('should be a string', () => {
      expect(typeof GOOGLE_OAUTH_SCOPE).toBe('string');
    });
  });

  describe('fetchUserInfo', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should fetch user info from Google OAuth endpoint', async () => {
      const mockUserInfo = {
        id: '123',
        email: 'user@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockUserInfo), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchUserInfo('test-token');

      expect(result).toEqual(mockUserInfo);
      expect(fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );
    });

    it('should use provided access token in Authorization header', async () => {
      const token = 'my-access-token';

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      await fetchUserInfo(token);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      expect(callArgs[1]?.headers).toHaveProperty('Authorization', `Bearer ${token}`);
    });

    it('should handle different token formats', async () => {
      const tokens = ['token1', 'token123', 'very-long-token-string'];

      for (const token of tokens) {
        vi.mocked(fetch).mockResolvedValueOnce(
          new Response(JSON.stringify({}), { status: 200 })
        );

        await fetchUserInfo(token);

        const lastCall = vi.mocked(fetch).mock.calls[vi.mocked(fetch).mock.calls.length - 1];
        expect(lastCall[1]?.headers).toHaveProperty('Authorization', `Bearer ${token}`);
      }
    });

    it('should return parsed JSON response', async () => {
      const mockData = {
        id: '456',
        email: 'another@example.com',
        name: 'Another User',
        picture: 'https://example.com/pic2.jpg',
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result = await fetchUserInfo('token');

      expect(result).toEqual(mockData);
    });

    it('should handle response with minimal fields', async () => {
      const minimalData = { id: '789' };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(minimalData), { status: 200 })
      );

      const result = await fetchUserInfo('token');

      expect(result.id).toBe('789');
    });

    it('should call the correct endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      await fetchUserInfo('token');

      const endpoint = vi.mocked(fetch).mock.calls[0][0];
      expect(endpoint).toBe('https://www.googleapis.com/oauth2/v2/userinfo');
    });
  });

  describe('createUserFromGoogleInfo', () => {
    it('should create user from Google info', () => {
      const googleInfo = {
        id: 'google-id-123',
        email: 'user@gmail.com',
        name: 'John Doe',
        picture: 'https://lh3.googleusercontent.com/a/default-user',
      };

      const result = createUserFromGoogleInfo(googleInfo, 'access-token');

      expect(result.id).toBe('google-id-123');
      expect(result.email).toBe('user@gmail.com');
      expect(result.name).toBe('John Doe');
      expect(result.picture).toBe('https://lh3.googleusercontent.com/a/default-user');
      expect(result.accessToken).toBe('access-token');
    });

    it('should include access token in user object', () => {
      const googleInfo = {
        id: '123',
        email: 'test@example.com',
        name: 'Test',
        picture: 'pic.jpg',
      };
      const token = 'my-token-123';

      const result = createUserFromGoogleInfo(googleInfo, token);

      expect(result.accessToken).toBe(token);
    });

    it('should preserve all Google info fields', () => {
      const googleInfo = {
        id: 'id-value',
        email: 'email@value.com',
        name: 'name-value',
        picture: 'picture-url',
      };

      const result = createUserFromGoogleInfo(googleInfo, 'token');

      expect(result.id).toBe(googleInfo.id);
      expect(result.email).toBe(googleInfo.email);
      expect(result.name).toBe(googleInfo.name);
      expect(result.picture).toBe(googleInfo.picture);
    });

    it('should handle different access tokens', () => {
      const googleInfo = {
        id: '123',
        email: 'user@example.com',
        name: 'User',
        picture: 'pic.jpg',
      };

      const tokens = ['token1', 'very-long-access-token-string', 'short'];

      for (const token of tokens) {
        const result = createUserFromGoogleInfo(googleInfo, token);
        expect(result.accessToken).toBe(token);
      }
    });

    it('should handle additional Google info fields', () => {
      const googleInfo = {
        id: '123',
        email: 'user@example.com',
        name: 'User',
        picture: 'pic.jpg',
        locale: 'en',
        verified_email: true,
        extraField: 'extra-value',
      };

      const result = createUserFromGoogleInfo(googleInfo, 'token');

      expect(result.id).toBe('123');
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('User');
      expect(result.picture).toBe('pic.jpg');
      expect(result.accessToken).toBe('token');
    });

    it('should create user with minimal required fields', () => {
      const minimalInfo = {
        id: 'id-only',
      };

      const result = createUserFromGoogleInfo(minimalInfo, 'token');

      expect(result.id).toBe('id-only');
      expect(result.accessToken).toBe('token');
    });

    it('should work with null/undefined non-required fields', () => {
      const googleInfo = {
        id: '123',
        email: null,
        name: undefined,
        picture: null,
      };

      const result = createUserFromGoogleInfo(googleInfo, 'token');

      expect(result.id).toBe('123');
      expect(result.accessToken).toBe('token');
    });

    it('should handle special characters in user data', () => {
      const googleInfo = {
        id: 'id-with-äöü',
        email: 'user+alias@example.com',
        name: "O'Brien-Smith",
        picture: 'https://example.com/pic?id=123&type=user',
      };

      const result = createUserFromGoogleInfo(googleInfo, 'token');

      expect(result.id).toBe('id-with-äöü');
      expect(result.email).toBe('user+alias@example.com');
      expect(result.name).toBe("O'Brien-Smith");
      expect(result.picture).toBe('https://example.com/pic?id=123&type=user');
    });
  });

  describe('fetchUserInfo and createUserFromGoogleInfo integration', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should work together in a typical flow', async () => {
      const googleInfo = {
        id: 'google-123',
        email: 'user@gmail.com',
        name: 'John Doe',
        picture: 'https://example.com/pic.jpg',
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(googleInfo), { status: 200 })
      );

      const fetchedInfo = await fetchUserInfo('access-token');
      const user = createUserFromGoogleInfo(fetchedInfo, 'access-token');

      expect(user.id).toBe('google-123');
      expect(user.email).toBe('user@gmail.com');
      expect(user.name).toBe('John Doe');
      expect(user.accessToken).toBe('access-token');
    });
  });
});
