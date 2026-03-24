import { useEffect, useRef, useState } from 'react';

interface OdometerValueProps {
  value: string;
}

export default function OdometerValue({ value }: OdometerValueProps) {
  const [displayChars, setDisplayChars] = useState<{ char: string; key: number }[]>([]);
  const prevValue = useRef(value);
  const keyCounter = useRef(0);

  useEffect(() => {
    const prevChars = prevValue.current.split('');
    const nextChars = value.split('');
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
