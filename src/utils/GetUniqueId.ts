/**
 * Generates a random string of specified length
 * @param n - Length of the random string to generate
 * @returns Random string
 */
export function getUniqueId(n: number): string {
  const str = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += str[Math.floor(Math.random() * str.length)];
  }
  return result;
}

export default getUniqueId;
