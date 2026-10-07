export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null
) {
  if (!invertedIndex) return "";

  const words: { word: string; position: number }[] = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      words.push({
        word,
        position,
      });
    }
  }

  words.sort((a, b) => a.position - b.position);

  return words.map((item) => item.word).join(" ");
}