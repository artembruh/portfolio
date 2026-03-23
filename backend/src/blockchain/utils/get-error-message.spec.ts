import { getErrorMessage } from './get-error-message';

describe('getErrorMessage', () => {
  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('fail'))).toBe('fail');
  });
  it('returns string as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error');
  });
  it('converts number to string', () => {
    expect(getErrorMessage(42)).toBe('42');
  });
  it('converts null to string', () => {
    expect(getErrorMessage(null)).toBe('null');
  });
  it('converts undefined to string', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });
});
