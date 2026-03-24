import { useEffect, useState, useCallback } from 'react';

interface BootScreenProps {
  onComplete: () => void;
}

interface BootLine {
  text: string;
  status?: string;
  delay: number;
}

const BOOT_LINES: BootLine[] = [
  { text: 'ARTEMBRUH INDUSTRIES (TM) TERMLINK', delay: 400 },
  { text: 'COPYRIGHT 2026 ARTEMBRUH IND.', delay: 300 },
  { text: '', delay: 200 },
  { text: '> INITIALIZING SYSTEM...', status: 'OK', delay: 500 },
  { text: '> LOADING MODULES...', status: 'OK', delay: 400 },
  { text: '> ESTABLISHING CONNECTION...', status: 'OK', delay: 600 },
  { text: '', delay: 200 },
  { text: '> WELCOME, USER', delay: 400 },
];

const PROGRESS_STEPS = 24;

export default function BootScreen({ onComplete }: BootScreenProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showStatus, setShowStatus] = useState<boolean[]>(new Array(BOOT_LINES.length).fill(false));
  const [progress, setProgress] = useState(0);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Skip on click or keypress
  useEffect(() => {
    const handleSkip = () => finish();
    window.addEventListener('click', handleSkip);
    window.addEventListener('keydown', handleSkip);
    return () => {
      window.removeEventListener('click', handleSkip);
      window.removeEventListener('keydown', handleSkip);
    };
  }, [finish]);

  // Boot sequence
  useEffect(() => {
    let totalDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    BOOT_LINES.forEach((line, index) => {
      totalDelay += line.delay;

      // Show line
      timeouts.push(
        setTimeout(() => {
          setVisibleLines(index + 1);
          setProgress(Math.floor(((index + 1) / BOOT_LINES.length) * PROGRESS_STEPS));
        }, totalDelay)
      );

      // Show status after line appears
      if (line.status) {
        timeouts.push(
          setTimeout(() => {
            setShowStatus((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
          }, totalDelay + 200)
        );
      }
    });

    // Complete
    totalDelay += 600;
    timeouts.push(setTimeout(finish, totalDelay));

    return () => timeouts.forEach(clearTimeout);
  }, [finish]);

  const progressBar =
    '█'.repeat(progress) + '░'.repeat(PROGRESS_STEPS - progress);

  return (
    <div className="max-w-2xl w-full">
      {BOOT_LINES.slice(0, visibleLines).map((line, index) => (
        <div key={index} className="flex justify-between" style={{ minHeight: line.text ? undefined : '1.2em' }}>
          <span style={{ color: 'var(--pip-primary)', textShadow: '0 0 8px #ffd52c44' }}>
            {line.text}
          </span>
          {line.status && showStatus[index] && (
            <span style={{ color: 'var(--pip-primary)', textShadow: '0 0 8px #ffd52c66' }}>
              {line.status}
            </span>
          )}
        </div>
      ))}

      {/* Blinking cursor on last visible line */}
      {visibleLines > 0 && visibleLines < BOOT_LINES.length && (
        <span className="boot-cursor" style={{ color: 'var(--pip-primary)' }}>▊</span>
      )}

      {/* Progress bar */}
      {visibleLines > 0 && (
        <div className="mt-6" style={{ color: 'var(--pip-primary)', textShadow: '0 0 8px #ffd52c44' }}>
          [{progressBar}] {Math.floor((progress / PROGRESS_STEPS) * 100)}%
        </div>
      )}
    </div>
  );
}
