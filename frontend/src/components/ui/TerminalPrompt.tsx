interface TerminalPromptProps {
  command: string;
}

export default function TerminalPrompt({ command }: TerminalPromptProps) {
  return (
    <div className="text-lg opacity-50 mb-2.5">
      {'>'} {command}
    </div>
  );
}
