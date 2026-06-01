jest.mock('jose', () => ({
  jwtVerify: async () => {
    throw new Error(
      'jwtVerify should not be called in tests that import jose.mock',
    );
  },
}));
