import { useEffect, useRef, useState } from 'react';

interface OdometerValueProps {
  value: string | undefined;
}

function padToGroupsOf3(value: string): string {
  // Extract only digits
  const digits = value.replace(/[^0-9]/g, '');
  if (!digits) return value;

  // Pad with leading zeros so total digit count is divisible by 3
  const remainder = digits.length % 3;
  const padded = remainder === 0 ? digits : digits.padStart(digits.length + (3 - remainder), '0');

  // Group by 3 with spaces
  const groups: string[] = [];
  for (let i = 0; i < padded.length; i += 3) {
    groups.push(padded.slice(i, i + 3));
  }
  return groups.join('\u00A0');
}

export default function OdometerValue({ value }: OdometerValueProps) {
  const [displayChars, setDisplayChars] = useState<{ char: string; key: number }[]>([]);
  const prevValue = useRef(value);
  const keyCounter = useRef(0);

  useEffect(() => {
    // Skip updates when value is undefined (e.g. during chain switch)
    if (value === undefined) return;

    // Check if value is purely numeric (possibly with existing separators)
    const isNumeric = /^[\d\s,]+$/.test(value);
    const formatted = isNumeric ? padToGroupsOf3(value) : value;
    const prev = prevValue.current ?? '';
    const prevFormatted = /^[\d\s,]+$/.test(prev) ? padToGroupsOf3(prev) : prev;

    const prevChars = prevFormatted.split('');
    const nextChars = formatted.split('');
    prevValue.current = value;

    // Pad from the right to align digits
    const maxLen = Math.max(prevChars.length, nextChars.length);
    const prevPadded = prevChars.join('').padStart(maxLen);
    const nextPadded = nextChars.join('').padStart(maxLen);

    const newDisplay = nextPadded.split('').map((char, i) => {
      const changed = prevPadded[i] !== char;
      return {
        char,
        key: changed ? ++keyCounter.current : displayChars[i]?.key ?? ++keyCounter.current,
      };
    });

    setDisplayChars(newDisplay);
  }, [value]);

  return (
    <span className="inline-flex overflow-hidden">
      {displayChars.map(({ char, key }) => (
        <span
          key={key}
          className="inline-block animate-[slideUp_0.3s_ease-out]"
        >
          {char}
        </span>
      ))}
    </span>
  );
}
