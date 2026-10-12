export function typingStats(text: string, target: string, elapsedMs: number) {
  const characters = [...text.normalize('NFC')]
  const expected = [...target.normalize('NFC')]
  const correct = characters.reduce((sum, value, index) => sum + Number(value === expected[index]), 0)
  return { correct, total: characters.length, accuracy: characters.length ? correct / characters.length * 100 : 100, cpm: elapsedMs > 0 ? correct * 60_000 / elapsedMs : 0, complete: characters.length >= expected.length }
}
